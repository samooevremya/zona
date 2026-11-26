"""Rebuild original winter Foley with numpy and ffmpeg. Pass the encoder path as argv[1]."""
from pathlib import Path
import subprocess
import sys
import numpy as np

out = Path(__file__).resolve().parents[1] / 'berezki' / 'audio'
out.mkdir(exist_ok=True)
rate = 24000
rng = np.random.default_rng(49721)

def noise(n, width):
    values = np.convolve(rng.normal(size=n + width), np.ones(width) / np.sqrt(width), mode='valid')
    return values[:n]

def write(name, samples):
    data = (.84 * samples / max(.5, np.max(np.abs(samples)))).astype('<f4')
    subprocess.run([sys.argv[1], '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(rate),
                    '-ac', '1', '-i', 'pipe:0', '-b:a', '72k', str(out / (name + '.mp3'))], input=data.tobytes(), check=True)

for material, grain, weight, resonance in [('Powder', 3, .35, 86), ('Packed', 6, .7, 115),
                                          ('Ice', 12, .60, 370), ('Slush', 23, .6, 88),
                                          ('Board', 20, .90, 167), ('Concrete', 10, .82, 101)]:
    for take in range(1, 4):
        t = np.arange(int(rate * .49)) / rate
        length = len(t)
        strikes = rng.uniform(.028,.053), rng.uniform(.11,.17)
        step = np.zeros(length)
        for i,start in enumerate(strikes):
            u = np.maximum(0,t-start)
            env = (1-np.exp(-u*160))*np.exp(-u*(21+i*3))
            step += env*(weight * noise(length,55) + .29*np.sin(2*np.pi*resonance*u)*np.exp(-u*18))
            if material in ('Powder','Packed','Slush'):
                for _ in range(46):
                    onset = start+rng.uniform(0,.105)
                    v = np.maximum(0,t-onset)
                    step += (t>=onset)*np.exp(-v*rng.uniform(150,500))*rng.uniform(.08,.29)*noise(length,grain)
            else:
                step += env*.42*noise(length,grain)
                if material=='Board': step += .12*env*np.sin(2*np.pi*312*u)
                if material=='Ice': step += .13*env*np.sin(2*np.pi*(910*u+220*u*u))
        write('winter'+material+str(take),step)

t = np.arange(14*rate)/rate
wind = (.50+.24*np.sin(2*np.pi*t/14)+.15*np.cos(4*np.pi*t/14))*(noise(len(t),440)+.27*noise(len(t),115))
wind += .16*np.sin(2*np.pi*79*t+.65*np.sin(t))+.09*np.sin(2*np.pi*113*t)
wind[:3000] = np.linspace(0,1,3000)*wind[:3000]+np.linspace(1,0,3000)*wind[-3000:]
write('winterWind',wind[:-3000])
fire = .08*noise(len(t),20)
for start in rng.uniform(0,13.8,190):
    i=int(start*rate);u=np.arange(1800)/rate
    fire[i:i+len(u)]+=rng.uniform(.06,.7)*np.exp(-u*145)*noise(len(u),3)
write('winterFire',fire)
t = np.arange(rate)/rate
write('winterCreak',np.sin(np.pi*t)**2*(.32*np.sin(2*np.pi*(112*t+96*t*t)+.7*np.sin(t*81))+.32*noise(len(t),20)) * (.45+.55*np.sin(t*27)**4))
