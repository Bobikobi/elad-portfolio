# Analyse a flight.mjs recording: per leg duration, turn per render frame, growth, framing, pull-back, clearance.
import json,sys,math
d=json.load(open(sys.argv[1])); W,H=d['W'],d['H']; rec=d['rec']; marks=d['marks']
def qang(a,b):
    dot=abs(sum(x*y for x,y in zip(a,b))); return math.degrees(2*math.acos(min(1,dot)))
def dR(fr,k):
    b=fr['b'].get(k); 
    if not b: return None
    a=b[2]*math.radians(fr['fov'])/H
    return 1/math.tan(a) if a>0 else float('inf')
rows=[]
for i in range(len(marks)-1):
    lab=marks[i]['label']; t0,t1=marks[i]['t'],marks[i+1]['t']
    fr=[f for f in rec if t0<=f['t']<t1]
    if len(fr)<10: print(lab,'no frames'); continue
    src,dst=lab.split('>')
    turns=[];sp=[];tr=[];dts=[]
    for a,b in zip(fr,fr[1:]):
        dt=(b['t']-a['t'])/1000; dts.append(dt)
        ang=qang(a['q'],b['q'])
        # per RENDER frame when the page exposes a frame counter (the rig's rAF can straddle a render)
        nf=(b['fl'][4]-a['fl'][4]) if a.get('fl') and len(a['fl'])>4 and b.get('fl') else 1
        turns.append(ang/nf if nf>0 else 0)
        # Rates over at least ~one frame: a sample a few ms after a long frame carries that frame's
        # whole move, and read over 3-6ms a resting camera's 0.7 deg/s drift showed as 4-9 deg/s and
        # stretched the measured duration past the flight (#70).
        w=fr[max(0,fr.index(b)-2)] if dt<0.010 else a
        wdt=(b['t']-w['t'])/1000
        tr.append(qang(w['q'],b['q'])/wdt); sp.append(math.dist(w['p'],b['p'])/wdt)
    peak=max(sp); 
    # movement start/end
    st=next(i for i,(s,r) in enumerate(zip(sp,tr)) if s>0.02*peak or r>2)
    end=None
    for j in range(st,len(sp)):
        k=j; ok=True
        while k<len(sp) and fr[k+1]['t']<fr[j+1]['t']+300:
            if sp[k]>0.02*peak or tr[k]>2: ok=False;break
            k+=1
        if ok: end=j;break
    ts=fr[st]['t']; te=fr[(end or len(sp)-1)+1]['t']; dur=(te-ts)/1000
    mv=fr[st:(end or len(sp)-1)+2]
    out={'leg':lab,'dur_s':round(dur,2),'max_turn_deg_frame':round(max(turns[st:(end or len(turns))+1]),2),
         'max_turn_rate_dps':round(max(tr[st:(end or len(tr))+1]),1),'median_dt_ms':round(sorted(dts)[len(dts)//2]*1000,1)}
    fl=[f['fl'] for f in fr if f['fl']]
    if fl: out['flight_dur']=max(x[2] for x in fl)
    if dst not in ('overview','belt'):
        r=[f['b'][dst][2] for f in mv if dst in f['b']]
        drops=[(r[k]-r[k+1])/r[k] for k in range(len(r)-1) if r[k+1]<r[k]]
        out['grow_worst_drop_pct']=round(max(drops)*100,2) if drops else 0.0
        out['grow_drop_frames']=sum(1 for x in drops if x>0.005)
        tq=ts+0.25*dur*1000; f25=min(mv,key=lambda f:abs(f['t']-tq)); b=f25['b'].get(dst)
        out['in_frame_25']= bool(b and not b[4] and -b[2]<b[0]<W+b[2] and -b[2]<b[1]<H+b[2])
        infr=next((f['t'] for f in mv if f['b'].get(dst) and not f['b'][dst][4] and -f['b'][dst][2]<f['b'][dst][0]<W+f['b'][dst][2] and -f['b'][dst][2]<f['b'][dst][1]<H+f['b'][dst][2]),None)
        out['first_in_frame_pct']=round((infr-ts)/(dur*1000)*100,1) if infr else None
        # How far the view must turn before the destination can be in frame (#70 crit 4): the angle
        # from the camera's heading at the start to the destination's centre.
        bd=(marks[i].get('bodies') or {}).get(dst)
        if bd:
            f0=fr[st]; x,y,z,w=f0['q']
            fwd=(-2*(x*z+w*y),-2*(y*z-w*x),-(1-2*(x*x+y*y)))
            v=[bd[k]-f0['p'][k] for k in range(3)]; n=math.sqrt(sum(c*c for c in v))
            out['turn_to_dst_deg']=round(math.degrees(math.acos(max(-1,min(1,sum(a*b for a,b in zip(fwd,v))/n)))),1)
    if src not in ('overview','belt') and dst!='overview':
        s=[dR(f,src) for f in mv]; s=[x for x in s if x]
        out['pullback_x']=round(max(s)/s[0],2)
    others=[k for k in ('mercury','venus','earth','mars','jupiter','saturn','uranus','neptune') if k not in (src,dst)]
    cl=min((dR(f,k),k) for f in mv for k in others if dR(f,k))
    out['min_clear_R']=(round(cl[0],2),cl[1])
    print(json.dumps(out))
# Saturn's rings (#70): the camera's elevation over the ring plane, seen from Saturn. A flight
# that swings the rings from open to edge-on quickly, or cuts through the plane close in, is the
# "abrupt" pass.
for i in range(len(marks)-1):
    lab=marks[i]['label']
    if 'saturn' not in lab: continue
    fr=[f for f in rec if marks[i]['t']<=f['t']<marks[i+1]['t'] and f.get('rg')]
    if len(fr)<10: continue
    el=[f['rg'][0] for f in fr]
    # per RENDER frame, as the turn is: the recorder's rAF can run twice in one render or skip one
    nf=lambda a,b:(b['fl'][4]-a['fl'][4]) if a.get('fl') and b.get('fl') and len(a['fl'])>4 else 1
    rate=max((abs(b['rg'][0]-a['rg'][0])/nf(a,b) if nf(a,b)>0 else 0) for a,b in zip(fr,fr[1:]))
    cross=[(round(fr[k+1]['rg'][1]/0.74,2)) for k in range(len(el)-1) if el[k]*el[k+1]<0]
    print(json.dumps({'ring':lab,'elev_start':round(el[0],1),'elev_end':round(el[-1],1),'max_elev_change_deg_frame':round(rate,2),'plane_crossings_at_R':cross}))
