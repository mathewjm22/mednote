import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, FileText, User, MessageSquare, Sparkles, Copy, Check, Settings, Stethoscope } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [patientContext, setPatientContext] = useState('');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [prompt, setPrompt] = useState('Please generate a comprehensive SOAP (Subjective, Objective, Assessment, Plan) note based on the provided patient context and conversation transcript. Ensure the tone is professional, objective, and medical.');
  const [generatedNote, setGeneratedNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript;
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }

        if (finalStr) {
          setTranscript((prev) => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalStr);
        }
        setInterimTranscript(interimStr);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone access denied. Please allow microphone permissions.');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
      setErrorMsg('Speech recognition is not supported in this browser. Please type manually.');
    }
  }, []);

  const toggleRecording = () => {
    setErrorMsg('');
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const generateNote = async () => {
    if (!transcript.trim() && !patientContext.trim()) return;
    
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const fullPrompt = `
${prompt}

### Patient Context
${patientContext || 'None provided.'}

### Conversation Transcript
${transcript}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: fullPrompt,
      });

      setGeneratedNote(response.text || '');
    } catch (error) {
      console.error('Error generating note:', error);
      setErrorMsg('Failed to generate note. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranscript(e.target.value);
    setInterimTranscript('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
          <Stethoscope size={24} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">MediNote AI</h1>
          <p className="text-xs text-slate-500">Clinical Documentation Assistant</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          {errorMsg && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100">
              {errorMsg}
            </div>
          )}

          {/* Patient Context */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0">
            <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <User size={18} className="text-blue-500" />
              <h2 className="font-medium text-slate-700">Patient Context</h2>
            </div>
            <div className="p-4">
              <textarea
                className="w-full h-24 resize-none outline-none text-slate-700 placeholder:text-slate-400 text-sm"
                placeholder="Enter patient demographics, chief complaint, past medical history, etc..."
                value={patientContext}
                onChange={(e) => setPatientContext(e.target.value)}
              />
            </div>
          </section>

          {/* Transcript */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-[300px]">
            <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-blue-500" />
                <h2 className="font-medium text-slate-700">Conversation</h2>
              </div>
              <button
                onClick={toggleRecording}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isRecording 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 shadow-sm shadow-red-200' 
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square size={14} className="fill-current" /> Stop
                  </>
                ) : (
                  <>
                    <Mic size={14} /> Record
                  </>
                )}
              </button>
            </div>
            <div className="p-4 flex-1 relative flex flex-col">
              <textarea
                className="w-full flex-1 resize-none outline-none text-slate-700 placeholder:text-slate-400 text-sm"
                placeholder="Record or type the conversation here..."
                value={transcript + (interimTranscript ? ' ' + interimTranscript : '')}
                onChange={handleTranscriptChange}
              />
              {isRecording && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs font-medium text-red-500 bg-red-50 px-2.5 py-1.5 rounded-full border border-red-100 animate-pulse shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Listening...
                </div>
              )}
            </div>
          </section>

          {/* Prompt */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0">
            <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Settings size={18} className="text-slate-400" />
              <h2 className="font-medium text-slate-700">Instructions</h2>
            </div>
            <div className="p-4">
              <textarea
                className="w-full h-20 resize-none outline-none text-slate-600 text-sm placeholder:text-slate-400"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          </section>

          <button
            onClick={generateNote}
            disabled={isGenerating || (!transcript.trim() && !patientContext.trim())}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow active:scale-[0.99]"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                Generating Note...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Medical Note
              </>
            )}
          </button>

        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)] sticky top-24">
          <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-emerald-500" />
              <h2 className="font-medium text-slate-700">Generated Note</h2>
            </div>
            {generatedNote && (
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
          <div className="p-8 flex-1 overflow-y-auto bg-white">
            {generatedNote ? (
              <div className="prose prose-slate prose-sm sm:prose-base max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-slate-600 prose-li:text-slate-600">
                <ReactMarkdown>{generatedNote}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                  <FileText size={32} className="text-slate-300" />
                </div>
                <p className="text-sm">Your generated medical note will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
