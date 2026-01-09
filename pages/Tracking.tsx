
import React, { useState, useRef } from 'react';
import Header from '../components/Header';
// Fix: Import the correct function names with aliases to match current component usage
import { analyzeComponent as analyzeImage, analyzeTacticalVideo as analyzeVideoInsights } from '../services/geminiService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_DATA = [
  { name: '01', hrs: 2 }, { name: '04', hrs: 4.5 }, { name: '08', hrs: 3 },
  { name: '12', hrs: 6 }, { name: '16', hrs: 4 }, { name: '20', hrs: 7.2 },
  { name: '24', hrs: 4.2 }, { name: '28', hrs: 5.5 },
];

const Tracking: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tracking' | 'vision' | 'video'>('tracking');
  const [image, setImage] = useState<string | null>(null);
  const [visionOutput, setVisionOutput] = useState('');
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [videoOutput, setVideoOutput] = useState('');
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const runVisionAnalysis = async () => {
    if (!image) return;
    setIsVisionLoading(true);
    setVisionOutput('Analyzing component for defects and design compliance...');
    try {
      const res = await analyzeImage(image, "Analyze this engineering component. Identify potential stress points, material defects, or inconsistencies with racing standards. Provide a structured report.");
      setVisionOutput(res || "Analysis failed.");
    } catch (e) {
      setVisionOutput("Error connecting to Gemini Vision.");
    } finally {
      setIsVisionLoading(false);
    }
  };

  const handleVideoFramesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Explicitly casting to File[] avoids 'unknown' type inference which causes errors in readAsDataURL
    const files = Array.from(e.target.files || []).slice(0, 3) as File[];
    const frameData: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        frameData.push(reader.result as string);
        if (frameData.length === files.length) setVideoFrames(frameData);
      };
      reader.readAsDataURL(file);
    });
  };

  const runVideoAnalysis = async () => {
    if (videoFrames.length === 0) return;
    setIsVideoLoading(true);
    setVideoOutput('Processing tactical footage sequence...');
    try {
      const res = await analyzeVideoInsights(videoFrames, "Analyze this sequence from a race car test session. Identify key aerodynamic behaviors or mechanical issues across these frames. Suggest tactical adjustments.");
      setVideoOutput(res || "Video analysis failed.");
    } catch (e) {
      setVideoOutput("Error connecting to Gemini Video Understanding.");
    } finally {
      setIsVideoLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background-dark">
      <Header title="Operations Lab" subtitle="Advanced Analytics & Tracking" />
      
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
        <div className="flex gap-4 border-b border-white/5 pb-px">
          <TabButton active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} label="Time Tracking" icon="timer" />
          <TabButton active={activeTab === 'vision'} onClick={() => setActiveTab('vision')} label="Component Vision AI" icon="camera" />
          <TabButton active={activeTab === 'video'} onClick={() => setActiveTab('video')} label="Tactical Video AI" icon="video_library" />
        </div>

        {activeTab === 'tracking' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-surface-dark border border-white/5 p-8 flex flex-col justify-between shadow-glow group">
                <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-all"></div>
                <div className="flex justify-between items-start z-10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Current Session</span>
                    <h3 className="text-xl font-bold text-white">Chassis Welding & Assembly</h3>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary border border-primary/20 animate-pulse">ACTIVE</div>
                </div>
                <div className="flex flex-col md:flex-row gap-8 mt-12 items-center md:items-end z-10">
                  <div className="flex-1 w-full">
                    <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wider">Session Summary</label>
                    <textarea className="w-full resize-none rounded-xl border border-white/10 bg-[#161616] p-3 text-sm text-white placeholder-gray-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Notes for this session..." rows={2}></textarea>
                  </div>
                  <div className="flex flex-col items-center md:items-end gap-2">
                    <div className="font-mono text-5xl font-bold tracking-tighter text-white tabular-nums drop-shadow-[0_0_15px_rgba(0,204,136,0.3)]">02:14:35</div>
                    <button className="bg-primary hover:bg-primary-hover text-black font-bold py-3 px-8 rounded-xl shadow-glow transition-all active:scale-95 flex items-center gap-2">
                      <span className="material-symbols-outlined">stop_circle</span> Clock Out
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <MiniStat label="Total Hours (Month)" value="42.5" unit="hrs" icon="schedule" />
                <MiniStat label="Credits Earned" value="8.5" unit="pts" icon="stars" />
              </div>
            </div>

            <div className="rounded-2xl bg-surface-dark border border-white/5 p-6 h-64">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest text-gray-400">Activity Trend</h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CHART_DATA}>
                  <defs>
                    <linearGradient id="colorHrs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00cc88" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00cc88" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#555'}} />
                  <YAxis hide />
                  <Tooltip contentStyle={{backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', fontSize: '12px'}} itemStyle={{color: '#00cc88'}} />
                  <Area type="monotone" dataKey="hrs" stroke="#00cc88" strokeWidth={3} fillOpacity={1} fill="url(#colorHrs)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'vision' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col gap-6">
              <div className="p-8 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-colors bg-white/[0.02]">
                {image ? (
                  <div className="relative w-full">
                    <img src={image} className="w-full max-h-[300px] object-contain rounded-xl" />
                    <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-black/60 p-2 rounded-full hover:bg-black/90"><span className="material-symbols-outlined text-sm">close</span></button>
                  </div>
                ) : (
                  <div className="cursor-pointer" onClick={() => document.getElementById('img-upload')?.click()}>
                    <span className="material-symbols-outlined text-5xl text-gray-600 mb-4 group-hover:text-primary transition-colors">add_a_photo</span>
                    <p className="text-sm font-medium text-gray-400">Upload component photo for AI analysis</p>
                    <p className="text-[10px] text-gray-600 mt-1">Accepts PNG, JPG, WebP</p>
                  </div>
                )}
                <input type="file" id="img-upload" hidden accept="image/*" onChange={handleImageUpload} />
              </div>
              <button 
                onClick={runVisionAnalysis}
                disabled={!image || isVisionLoading}
                className="w-full py-4 bg-primary text-black font-bold rounded-2xl shadow-glow disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
              >
                {isVisionLoading ? (
                  <><span className="material-symbols-outlined animate-spin">refresh</span> Processing...</>
                ) : (
                  <><span className="material-symbols-outlined">robot_2</span> Run Gemini Diagnosis</>
                )}
              </button>
            </div>
            <div className="bg-surface-dark border border-white/10 rounded-3xl p-6 flex flex-col">
              <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">description</span> AI Analysis Result
              </h3>
              <div className="flex-1 text-sm text-gray-300 leading-relaxed font-body whitespace-pre-wrap max-h-[450px] overflow-y-auto pr-2 custom-scroll">
                {visionOutput || "AI analysis output will appear here once you upload and process a component photo."}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'video' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="flex flex-col gap-6">
              <div className="p-8 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center bg-white/[0.02] hover:border-primary/50 transition-colors">
                {videoFrames.length > 0 ? (
                  <div className="flex gap-2 flex-wrap justify-center">
                    {videoFrames.map((f, i) => (
                      <img key={i} src={f} className="w-24 h-24 object-cover rounded-lg border border-white/10" />
                    ))}
                    <button onClick={() => setVideoFrames([])} className="w-24 h-24 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 flex flex-col items-center justify-center gap-1">
                      <span className="material-symbols-outlined">delete</span>
                      <span className="text-[10px] font-bold uppercase">Clear</span>
                    </button>
                  </div>
                ) : (
                  <div className="cursor-pointer" onClick={() => document.getElementById('vid-upload')?.click()}>
                    <span className="material-symbols-outlined text-5xl text-gray-600 mb-4">video_file</span>
                    <p className="text-sm font-medium text-gray-400">Select frame sequence for tactical analysis</p>
                    <p className="text-[10px] text-gray-600 mt-1">Upload up to 3 key frames</p>
                  </div>
                )}
                <input type="file" id="vid-upload" hidden multiple accept="image/*" onChange={handleVideoFramesUpload} />
              </div>
              <button 
                onClick={runVideoAnalysis}
                disabled={videoFrames.length === 0 || isVideoLoading}
                className="w-full py-4 bg-primary text-black font-bold rounded-2xl shadow-glow disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isVideoLoading ? (
                  <><span className="material-symbols-outlined animate-spin">refresh</span> Processing sequence...</>
                ) : (
                  <><span className="material-symbols-outlined">auto_graph</span> Analyze Tactical Sequence</>
                )}
              </button>
            </div>
            <div className="bg-surface-dark border border-white/10 rounded-3xl p-6 flex flex-col">
              <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">analytics</span> Tactical Insights
              </h3>
              <div className="flex-1 text-sm text-gray-300 leading-relaxed font-body whitespace-pre-wrap max-h-[450px] overflow-y-auto pr-2 custom-scroll">
                {videoOutput || "Analyze frame sequences to get tactical AI insights about aerodynamics and mechanical performance."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
      active ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:text-gray-300'
    }`}
  >
    <span className="material-symbols-outlined text-[20px]">{icon}</span>
    {label}
  </button>
);

const MiniStat = ({ label, value, unit, icon }: any) => (
  <div className="flex-1 rounded-xl bg-surface-dark border border-white/5 p-5 flex items-center justify-between group hover:border-white/10 transition-colors">
    <div className="flex flex-col gap-1">
      <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{label}</span>
      <span className="text-2xl font-bold text-white tracking-tight">{value}<span className="text-xs text-gray-600 font-medium ml-1 uppercase">{unit}</span></span>
    </div>
    <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
      <span className="material-symbols-outlined">{icon}</span>
    </div>
  </div>
);

export default Tracking;
