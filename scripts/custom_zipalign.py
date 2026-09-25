import zipfile
import struct
import io
import os

def align_apk(input_apk, output_apk, dex_data=None):
    zin = zipfile.ZipFile(input_apk, 'r')
    fout = open(output_apk, 'wb')
    
    entries = []
    
    for item in zin.infolist():
        header_offset = fout.tell()
        filename_bytes = item.filename.encode('utf-8')
        
        # Read file data
        if item.filename == 'classes.dex' and dex_data is not None:
            raw_data = dex_data
            compress_type = item.compress_type
        else:
            raw_data = zin.read(item.filename)
            compress_type = item.compress_type
            
        crc = zlib_crc = zipfile.crc32(raw_data) & 0xffffffff
        uncompressed_size = len(raw_data)
        
        if compress_type == zipfile.ZIP_DEFLATED:
            import zlib
            compressor = zlib.compressobj(zlib.Z_DEFAULT_COMPRESSION, zlib.DEFLATED, -15)
            compressed_data = compressor.compress(raw_data) + compressor.flush()
            compressed_size = len(compressed_data)
        else:
            compress_type = zipfile.ZIP_STORED
            compressed_data = raw_data
            compressed_size = uncompressed_size
            
        extra = b''
        # 4096-alignment for stored .so files, 4-alignment for other stored files
        if compress_type == zipfile.ZIP_STORED:
            alignment = 4096 if item.filename.endswith('.so') else 4
            curr = header_offset + 30 + len(filename_bytes)
            pad = (alignment - (curr % alignment)) % alignment
            extra = b'\x00' * pad
            
        local_header = struct.pack(
            '<4sHHHHHIIIHH',
            b'PK\x03\x04',
            item.extract_version,
            item.flag_bits,
            compress_type,
            item.date_time[3] << 11 | item.date_time[4] << 5 | item.date_time[5] // 2,
            (item.date_time[0] - 1980) << 9 | item.date_time[1] << 5 | item.date_time[2],
            crc,
            compressed_size,
            uncompressed_size,
            len(filename_bytes),
            len(extra)
        )
        
        fout.write(local_header)
        fout.write(filename_bytes)
        fout.write(extra)
        data_offset = fout.tell()
        
        if compress_type == zipfile.ZIP_STORED and item.filename.endswith('.so'):
            assert data_offset % 4096 == 0, f"Alignment failed for {item.filename}: {data_offset} % 4096 = {data_offset % 4096}"
            
        fout.write(compressed_data)
        
        entries.append({
            'item': item,
            'filename_bytes': filename_bytes,
            'compress_type': compress_type,
            'crc': crc,
            'compressed_size': compressed_size,
            'uncompressed_size': uncompressed_size,
            'header_offset': header_offset,
            'extra': extra
        })
        
    central_dir_offset = fout.tell()
    
    # Write Central Directory
    for e in entries:
        item = e['item']
        cd_header = struct.pack(
            '<4sHHHHHHIIIHHHHHII',
            b'PK\x01\x02',
            item.create_version,
            item.extract_version,
            item.flag_bits,
            e['compress_type'],
            item.date_time[3] << 11 | item.date_time[4] << 5 | item.date_time[5] // 2,
            (item.date_time[0] - 1980) << 9 | item.date_time[1] << 5 | item.date_time[2],
            e['crc'],
            e['compressed_size'],
            e['uncompressed_size'],
            len(e['filename_bytes']),
            0, # extra field len in central dir
            0, # comment len
            0, # disk num start
            item.internal_attr,
            item.external_attr,
            e['header_offset']
        )
        fout.write(cd_header)
        fout.write(e['filename_bytes'])
        
    central_dir_size = fout.tell() - central_dir_offset
    
    # End of central directory record
    eocd = struct.pack(
        '<4sHHHHIIH',
        b'PK\x05\x06',
        0, 0,
        len(entries),
        len(entries),
        central_dir_size,
        central_dir_offset,
        0
    )
    fout.write(eocd)
    fout.close()
    zin.close()
    print("[✔] Successfully created page-aligned APK!")

if __name__ == '__main__':
    align_apk('/Users/inintr00416/Desktop/baron-tv-remote/debug/iMirror-armeabi-v7a.apk', '/Users/inintr00416/Desktop/baron-tv-remote/debug/test_aligned.apk')
