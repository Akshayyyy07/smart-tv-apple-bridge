export const KEY_CODES: Record<string, number> = {
  power: 26,
  sleep: 223,
  wakeup: 224,
  home: 3,
  back: 4,
  menu: 82,
  settings: 176,
  up: 19,
  down: 20,
  left: 21,
  right: 22,
  ok: 23,
  enter: 66,
  vol_up: 24,
  vol_down: 25,
  mute: 164,
  ch_up: 166,
  ch_down: 167,
  play_pause: 85,
  play: 126,
  pause: 127,
  stop: 86,
  next: 87,
  prev: 88,
  rewind: 89,
  fast_forward: 90,
  input: 178,
  num_0: 7,
  num_1: 8,
  num_2: 9,
  num_3: 10,
  num_4: 11,
  num_5: 12,
  num_6: 13,
  num_7: 14,
  num_8: 15,
  num_9: 16,
};

export const APP_SHORTCUTS: Record<string, { package: string; activity?: string; intentAction?: string }> = {
  youtube: {
    package: 'com.google.android.youtube.tv',
  },
  netflix: {
    package: 'com.netflix.mediaclient',
  },
  prime: {
    package: 'com.amazon.amazonvideo.livingroom',
  },
  hotstar: {
    package: 'in.startv.hotstar.dplus.tv',
  },
  jiocinema: {
    package: 'com.jio.media.stb.ondemand',
  },
  settings: {
    package: 'com.cvte.tv.setting',
    activity: '.TvSettingActivity',
  },
  inputs: {
    package: 'com.cvte.tv.setting',
    intentAction: 'com.cvte.intent.SHOW_INPUT',
  },
  channels: {
    package: 'com.cvte.tv.setting',
    intentAction: 'com.cvte.intent.action.CHANNEL_LIST',
  },
};
