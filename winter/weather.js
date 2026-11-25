'use strict';
window.winterClimate = (() => {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  // Seconds of simulation. Moving air reaches the walker before the blowing snow does.
  const cycle = 425;
  const weatherKeys = [
    [0, .12, .04, 'Пасмурно'], [104, .12, .04, 'Пасмурно'],
    [116, .69, .05, 'Ветер крепчает'], [130, 1, .90, 'Позёмка'],
    [145, 1, 1, 'Метель'], [268, .94, 1, 'Метель'],
    [295, .44, .49, 'Снег стихает'], [325, .10, .07, 'Небольшой снег'],
    [355, .05, .015, 'Ясно'], [425, .12, .04, 'Пасмурно']
  ];
  function sample(seconds) {
    const t = seconds % cycle;
    let i = 1;
    while (weatherKeys[i][0] < t) i++;
    const a = weatherKeys[i - 1], b = weatherKeys[i];
    const mix = (t - a[0]) / (b[0] - a[0]);
    const wind = a[1] + (b[1] - a[1]) * mix;
    const snow = a[2] + (b[2] - a[2]) * mix;
    const minutes = (10 * 60 + 20 + seconds * 1.05) % 1440;
    const night = (1 - Math.cos((minutes - 780) / 1440 * 2 * Math.PI)) / 2;
    return {wind, snow, minutes, weather: t > 104 && t < 127 ? 'Ветер крепчает' : (mix > .5 ? b[3] : a[3]),
      temp: Math.round(-10 - 14 * night - 5 * wind), dark: clamp((night - .30) * .90, 0, .62)};
  }
  function cooling(climate, shelter, wet, food) {
    const exposure = 1 - .8 * shelter;
    const windChill = climate.wind * climate.wind * .60;
    const dryLoss = .32 + Math.abs(climate.temp) * .018 + windChill;
    return dryLoss * (.60 + .40 * exposure) + windChill * exposure * .32 + wet * .007 + (food < 25 ? .08 : 0);
  }
  return {sample, cooling};
})();
