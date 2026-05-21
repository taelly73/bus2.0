import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, CalendarDays, Bus, Printer } from 'lucide-react';
import { getBusData } from '../lib/dataParser';

export const Detail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = getBusData();
  const item = data.find(d => d.id === id);

  if (!item) {
    return (
    <div className="min-h-screen bg-[#F5F8FC] flex items-center justify-center font-sans text-[#1A2C3E]">
      <div className="bg-white p-8 rounded-2xl border border-[#E8EEF4] shadow-[0_2px_12px_rgba(29,111,143,0.03)] text-center">
        <h2 className="text-xl font-bold text-[#1A2C3E] mb-3 leading-[1.4]">未找到该公示记录</h2>
        <button onClick={() => navigate(-1)} className="text-[#1D6F8F] font-medium hover:underline text-sm">返回上一页</button>
      </div>
    </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F8FC] font-sans text-[#1A2C3E] pb-24 selection:bg-[#1D6F8F] selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-[#E8EEF4] sticky top-0 z-30 shadow-[0_2px_8px_rgba(29,111,143,0.06)] h-[60px] flex items-center">
        <div className="max-w-[800px] mx-auto px-4 w-full flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-4 text-[#6C8EA0] hover:text-[#1D6F8F] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-[#1A2C3E] flex items-center">
              <span className="w-1.5 h-4 bg-[#1D6F8F] rounded mr-2.5"></span>
              公示详情
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-4 mt-8 md:mt-12">
        <article className="bg-white rounded-2xl border border-[#E8EEF4] shadow-[0_4px_24px_rgba(29,111,143,0.04)] overflow-hidden">
          <div className="p-8 md:p-12 flex flex-col relative w-full">
            {/* Watermark Deco */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none text-[#1D6F8F]">
              <Bus className="w-48 h-48" />
            </div>

            <div className="text-center border-b border-[#E8EEF4] pb-8 mb-8 relative z-10 w-full mx-auto">
              <span className="inline-block px-3 py-1 bg-[#1D6F8F]/10 text-[#1D6F8F] text-[12px] font-semibold tracking-wide rounded-lg mb-6 flex items-center justify-center w-max mx-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1D6F8F] mr-2"></span>
                {item.category || '未分类'}
              </span>
              <h1 className="text-2xl md:text-[28px] font-bold text-[#1A2C3E] mb-6 leading-[1.5] tracking-tight">
                {item.title}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center gap-4 text-[13px] text-[#6C8EA0] font-medium">
                <span className="flex items-center"><CalendarDays className="w-4 h-4 mr-1.5 opacity-70" /> {item.date}</span>
                {item.url && (
                  <>
                    <span className="text-[#E8EEF4]">|</span>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#1D6F8F] hover:underline flex items-center transition-all hover:-translate-y-[1px]">
                      <ExternalLink className="w-4 h-4 mr-1.5" /> 查阅官方原文
                    </a>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex-1 text-[15px] md:text-base leading-[1.8] text-[#1A2C3E] relative z-10 text-justify">
              {item.content ? (
                <div className="whitespace-pre-wrap break-words">{item.content}</div>
              ) : (
                <div className="text-[#6C8EA0] flex flex-col items-center justify-center p-8 md:py-16 bg-[#F5F8FC] rounded-2xl border border-[#E8EEF4] border-dashed">
                   <ExternalLink className="w-10 h-10 mb-4 opacity-40 text-[#1D6F8F]" />
                   <p className="font-medium text-base mb-2 text-[#1A2C3E]">系统无法直接提取该页面的正文</p>
                   <p className="text-sm text-[#6C8EA0] mb-6">由于源站的安全策略限制（如微博需要登录），无法直接显示。</p>
                   {item.url && (
                     <a 
                       href={item.url} 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       className="px-6 py-3 bg-[#1D6F8F] text-white rounded-xl text-sm font-bold hover:bg-[#155973] transition-colors shadow-sm flex items-center"
                     >
                       前往官网查看原文详情 <ExternalLink className="w-4 h-4 ml-2" />
                     </a>
                   )}
                </div>
              )}
            </div>
            
            <div className="mt-12 pt-6 border-t border-[#E8EEF4] flex justify-end relative z-10 w-full">
              <button 
                onClick={() => window.print()} 
                className="px-6 py-2.5 bg-[#F5F8FC] text-[#1D6F8F] rounded-xl text-sm font-bold hover:bg-[#E8EEF4] transition-colors border border-transparent hover:border-[#1D6F8F]/10 flex items-center shadow-sm"
              >
                <Printer className="w-4 h-4 mr-2" />
                打印存档
              </button>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
};
