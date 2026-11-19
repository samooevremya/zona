  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function avatar(name, fac) {
    var h = hash(name || '?'), s = sv('svg', { 'class': 'ava', viewBox: '0 0 48 48', 'aria-hidden': 'true' });
    var coats = { loner: ['#5d6243', '#6b5a3c', '#4d5a4a', '#70664a'], bandit: ['#2b2b30', '#3a3340', '#33302c'], army: ['#3f5a36', '#4a6040'], trader: ['#4c5a60', '#5a5248'] }[fac] || ['#555'];
    var coat = coats[h % coats.length], skin = ['#c9a784', '#b8946f', '#d3b392', '#a98562'][(h >>> 3) % 4], gear = (h >>> 5) % 4, beard = (h >>> 8) % 3 === 0;
    s.appendChild(sv('rect', { width: 48, height: 48, fill: '#0c100b' }));
    s.appendChild(sv('path', { d: 'M0 30h48M0 18h48M0 6h48', stroke: '#141a12', 'stroke-width': 1 }));
    if (fac === 'mutant') {
      s.appendChild(sv('path', { d: 'M10 34c0-9 6-17 14-17s14 8 14 17c-3 4-8 6-14 6s-11-2-14-6zM12 20l2-9 6 6M36 20l-2-9-6 6', fill: '#5a2a26', stroke: '#d64541', 'stroke-width': 1 }));
      s.appendChild(sv('path', { d: 'M18 33l2 4 2-4 2 4 2-4 2 4 2-4', fill: 'none', stroke: '#d8d2bc', 'stroke-width': 1.200 }));
      return s;
    }
    s.appendChild(sv('path', { d: 'M4 48c0-11 8-16 20-16s20 5 20 16z', fill: coat }));
    if (gear === 0) s.appendChild(sv('ellipse', { cx: 24, cy: 20.500, rx: 12, ry: 13.500, fill: coat, stroke: '#0c100b', 'stroke-width': .8 }));
    s.appendChild(sv('path', { d: 'M20 30h8v5l-4 3-4-3z', fill: skin }));
    s.appendChild(sv('ellipse', { cx: 24, cy: 21, rx: 8, ry: 9.500, fill: skin }));
    if (beard) s.appendChild(sv('path', { d: 'M16.500 23c1 6 4 8.500 7.500 8.500s6.500-2.500 7.500-8.500c-2 2-5 3-7.500 3s-5.500-1-7.500-3z', fill: '#3a3128' }));
    s.appendChild(sv('path', { d: 'M19.500 20.500h3M25.500 20.500h3', stroke: '#1c1812', 'stroke-width': 1.400, 'stroke-linecap': 'round' }));
    if (gear === 0) s.appendChild(sv('path', { d: 'M15 18c1-5 4.500-8 9-8s8 3 9 8c-2.500-2.500-5.500-3.500-9-3.500s-6.500 1-9 3.500z', fill: '#0c100b', opacity: .45 }));
    else if (gear === 1) s.appendChild(sv('path', { d: 'M15.500 17.500c0-6 4-9.500 8.500-9.500s8.500 3.500 8.500 9.500c-3-1.500-6-2-8.500-2s-5.500.5-8.500 2z', fill: '#2c2f33' }));
    else if (gear === 2) s.appendChild(sv('path', { d: 'M15 17c0-5 4-8.500 9-8.500s9 3.500 9 8.500l5 1.500-1 1.800-13-1.500-9 .5z', fill: '#4a4436' }));
    else s.appendChild(sv('path', { d: 'M16 16c1-4 4-6.500 8-6.500s7 2.500 8 6.500c-2.500-2-5-2.500-8-2.500s-5.500.5-8 2.500z', fill: '#3a3128' }));
    s.appendChild(sv('rect', { x: 0, y: 44, width: 48, height: 4, fill: FCOL[fac] || '#555', opacity: .9 }));
    return s;
  }
