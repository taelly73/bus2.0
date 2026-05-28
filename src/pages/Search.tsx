import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, ArrowLeft, Filter, FileText, Clock, ChevronDown, ChevronUp, CalendarDays, Sparkles } from 'lucide-react';
import { getBusData } from '../lib/dataParser';
import ReactMarkdown from 'react-markdown';

// Dictionary for synonym and related expansion
const SYNONYMS: Record<string, string[]> = {
  "比赛": ["赛事", "马拉松", "挑战赛", "自行车赛", "徒步大会", "铁人三项"],
  "马拉松": ["长跑", "赛事", "比赛"],
  "停运": ["停驶", "暂停运营"],
  "改道": ["绕行", "甩站", "临时运营", "导改"],
  "增站": ["增设站位", "新增站", "增站"],
  "撤站": ["取消站位", "甩站", "撤销"],
  "放假": ["节日", "假期", "国庆", "中秋", "五一", "清明", "春节"],
  "节假日": ["节日", "假期", "国庆", "中秋", "五一", "清明", "春节"],
  "单车": ["自行车"],
  "地铁": ["接驳"]
};

// Fuzzy substring match for typo tolerance (handles 1 character substitution or insertion/deletion if length >= 3)
const fuzzySubstringMatch = (query: string, text: string): boolean => {
  if (text.includes(query)) return true;
  // Expand query via synonyms
  const synonyms = SYNONYMS[query];
  if (synonyms && synonyms.some(syn => text.includes(syn))) return true;
  
  if (query.length < 3) return false;

  // 1 substitution error tolerance
  for (let i = 0; i <= text.length - query.length; i++) {
    let diff = 0;
    for (let j = 0; j < query.length; j++) {
      if (text[i + j] !== query[j]) {
        diff++;
        if (diff > 1) break;
      }
    }
    if (diff <= 1) return true;
  }
  return false;
};

// A relatively safe and simple boolean search evaluator
// Supports basic AND, OR, NOT operations
const evaluateSearch = (query: string, text: string): boolean => {
  if (!query.trim()) return true;
  const q = query.trim();
  const lowerText = text.toLowerCase();
  
  if (q.includes(' OR ')) {
    const parts = q.split(' OR ');
    return parts.some(part => evaluateSearch(part, text));
  }
  
  if (q.includes(' AND ')) {
    const parts = q.split(' AND ');
    return parts.every(part => evaluateSearch(part, text));
  }
  
  if (q.startsWith('NOT ')) {
    const term = q.substring(4).trim().toLowerCase();
    return !fuzzySubstringMatch(term, lowerText);
  }
  
  // Try to match the term globally against dictionary first, but it's handled in fuzzySubstringMatch
  return fuzzySubstringMatch(q.toLowerCase(), lowerText);
};

export const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const data = getBusData();

  const initialMode = searchParams.get('mode') === 'ai' ? 'ai' : 'traditional';
  const [searchMode, setSearchMode] = useState<'traditional' | 'ai'>(initialMode);
  const [aiAnswer, setAiAnswer] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFilters, setShowFilters] = useState(false); // Mobile

  const categories = useMemo(() => {
    const cats = new Set(data.map(d => d.category).filter(Boolean));
    return Array.from(cats);
  }, [data]);

  const fetchAiAnswer = async (q: string) => {
    setAiAnswer('');
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'AI search failed');
      setAiAnswer(result.text);
    } catch (e: any) {
      console.error(e);
      setAiAnswer(e.message || '由于网络或服务原因，AI检索失败，请稍后再试。');
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (searchMode === 'ai' && searchParams.get('q')) {
      fetchAiAnswer(searchParams.get('q') as string);
    }
  }, [searchParams, searchMode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (searchMode === 'ai') params.set('mode', 'ai');
    setSearchParams(params);
    setShowFilters(false);
  };

  const currentQuery = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || '';

  const results = useMemo(() => {
    return data.filter(item => {
      // Category filter
      if (currentCategory && item.category !== currentCategory) return false;
      
      // Date filter
      if (startDate || endDate) {
         // item.date is like "2025.12.30"
         const itemDate = new Date(item.date.replace(/\./g, '-')).getTime();
         if (startDate && itemDate < new Date(startDate).getTime()) return false;
         if (endDate && itemDate > new Date(endDate).getTime()) return false;
      }
      
      // Text search
      const searchText = `${item.title} ${item.content} ${item.category}`;
      if (currentQuery) {
        return evaluateSearch(currentQuery, searchText);
      }
      
      return true;
    });
  }, [data, currentQuery, currentCategory, startDate, endDate]);

  const resetFilters = () => {
    setQuery('');
    setCategory('');
    setStartDate('');
    setEndDate('');
    setSearchParams({});
    setAiAnswer('');
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] font-sans text-[#1A2C3E] selection:bg-[#1D6F8F] selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-[#E8EEF4] sticky top-0 z-30 shadow-[0_2px_8px_rgba(29,111,143,0.06)] h-[60px] flex items-center">
        <div className="max-w-[1280px] mx-auto px-4 w-full flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate('/')} className="mr-4 text-[#6C8EA0] hover:text-[#1D6F8F] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-[#1A2C3E] flex items-center">
              <span className="w-1.5 h-4 bg-[#1D6F8F] rounded mr-2.5"></span>
              检索结果
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 mt-6 mb-16 flex flex-col md:flex-row gap-6">
        
        {/* Mobile Filters Toggle */}
        <div className="md:hidden">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-3 bg-white border border-[#E8EEF4] rounded-xl font-medium text-[13px] text-[#1A2C3E] shadow-[0_2px_8px_rgba(29,111,143,0.04)]"
          >
            <span className="flex items-center">
              <Filter className="w-4 h-4 mr-2 text-[#1D6F8F]" />
              筛选检索条件
            </span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Filters */}
        <aside className={`md:w-72 flex-shrink-0 ${showFilters ? 'block' : 'hidden'} md:block`}>
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-[#E8EEF4] shadow-[0_2px_12px_rgba(29,111,143,0.03)] sticky top-[84px]">
            <h2 className="text-[15px] font-bold text-[#1A2C3E] mb-5 flex items-center">
              <Filter className="w-4 h-4 mr-2 text-[#1D6F8F]" />
              高级信息检索
            </h2>
            
            <form onSubmit={handleSearch} className="space-y-5">
              {/* Search Mode Toggle */}
              <div className="bg-[#F5F8FC] p-1 rounded-xl flex items-center relative">
                <button
                  type="button"
                  onClick={() => setSearchMode('traditional')}
                  className={`flex-1 py-1.5 text-[13px] font-medium rounded-lg transition-colors z-10 ${searchMode === 'traditional' ? 'text-[#1D6F8F] shadow-sm bg-white' : 'text-[#6C8EA0] hover:text-[#1A2C3E]'}`}
                >
                  关键词检索
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('ai')}
                  className={`flex-1 py-1.5 text-[13px] font-medium rounded-lg transition-colors z-10 flex items-center justify-center ${searchMode === 'ai' ? 'text-[#1D6F8F] shadow-sm bg-white' : 'text-[#6C8EA0] hover:text-[#1A2C3E]'}`}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  AI 智能检索
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 text-[#6C8EA0] uppercase tracking-wider">
                  {searchMode === 'ai' ? '自然语言提问' : '检索词'}
                </label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C8EA0]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchMode === 'ai' ? "例：五一去植物园做什么车..." : "输入关键词..."}
                    className="w-full pl-9 pr-3 py-2.5 border border-[#E8EEF4] rounded-xl focus:ring-2 focus:ring-[#1D6F8F]/20 focus:border-[#1D6F8F] transition-colors text-[13px] bg-[#F5F8FC] outline-none"
                  />
                </div>
              </div>

              {searchMode === 'traditional' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-2 text-[#6C8EA0] uppercase tracking-wider">公告分类</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[#E8EEF4] rounded-xl focus:ring-2 focus:ring-[#1D6F8F]/20 focus:border-[#1D6F8F] transition-colors text-[13px] appearance-none bg-[#F5F8FC] outline-none"
                    >
                      <option value="">全部类别</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-[13px] text-[#1D6F8F] hover:underline font-medium flex items-center"
                    >
                      {showAdvanced ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
                      高级过滤选项
                    </button>
                  </div>

                  {showAdvanced && (
                    <div className="space-y-4 pt-4 border-t border-[#E8EEF4]">
                      <div>
                        <label className="block text-xs font-semibold mb-2 text-[#6C8EA0] uppercase tracking-wider">发布时间范围</label>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-2 py-2 border border-[#E8EEF4] rounded-xl text-xs bg-[#F5F8FC] outline-none"
                          />
                          <span className="text-[#6C8EA0]">-</span>
                          <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-2 py-2 border border-[#E8EEF4] rounded-xl text-xs bg-[#F5F8FC] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-col gap-3 pt-3 mt-2 border-t border-[#E8EEF4]">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1D6F8F] hover:bg-[#155A75] text-white rounded-xl text-[13px] font-semibold transition-colors shadow-sm"
                >
                  {searchMode === 'ai' ? '向 AI 提问' : '应用筛选'}
                </button>
                
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full py-2.5 bg-[#F5F8FC] hover:bg-[#E8EEF4] text-[#1A2C3E] rounded-xl text-[13px] font-medium transition-colors"
                >
                  清除所有过滤项
                </button>
              </div>
            </form>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 w-full space-y-6">
          
          {searchMode === 'ai' && currentQuery ? (
             <div className="bg-gradient-to-r from-[#1D6F8F] to-[#2B92BA] p-[1px] rounded-2xl shadow-[0_4px_24px_rgba(29,111,143,0.1)]">
               <div className="bg-white p-6 rounded-2xl">
                 <h2 className="flex items-center text-[#1D6F8F] font-bold text-[16px] mb-4">
                   <Sparkles className="w-5 h-5 mr-2" /> AI 智能解答
                 </h2>
                 <div className="text-[15px] text-[#1A2C3E] leading-[1.8]">
                    {isAiLoading ? (
                      <div className="flex items-center text-[#6C8EA0]">
                        <div className="w-4 h-4 border-2 border-[#1D6F8F] border-t-transparent rounded-full animate-spin mr-3"></div>
                        DeepSeek AI 正在深度检索并总结数据...
                      </div>
                    ) : (
                      <div className="markdown-body text-[#1A2C3E]">
                         <ReactMarkdown>{aiAnswer || '未能找到相关信息。'}</ReactMarkdown>
                      </div>
                    )}
                 </div>
               </div>
             </div>
          ) : null}

          <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <h2 className="text-[14px] text-[#6C8EA0]">
              相关记录：<strong className="text-[#1A2C3E] font-bold mx-1 text-[16px]">{results.length}</strong> 条 
              {currentCategory && searchMode === 'traditional' && <span className="ml-1 text-[13px] bg-[#E8EEF4] px-2 py-0.5 rounded text-[#1D6F8F]">{currentCategory}</span>} 
              {currentQuery && searchMode === 'traditional' && <span className="ml-1 text-[13px]">包含关键字: "{currentQuery}"</span>}
            </h2>
          </div>
          
          <div className="space-y-4">
            {results.length > 0 ? (
              results.map(item => (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/detail/${item.id}`)}
                  className="flex flex-col p-5 md:p-6 border border-[#E8EEF4] bg-white hover:border-[#1D6F8F]/30 hover:bg-[#F8FAFC] hover:shadow-[0_4px_16px_rgba(29,111,143,0.06)] cursor-pointer rounded-2xl transition-all group"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="bg-[#1D6F8F]/10 text-[#1D6F8F] text-[11px] px-2.5 py-0.5 rounded-md font-medium flex items-center">
                       <span className="w-1.5 h-1.5 rounded-full bg-[#1D6F8F] mr-1.5"></span>
                       {item.category || '未分类'}
                    </span>
                    <span className="text-xs text-[#6C8EA0] font-mono flex items-center">
                       <CalendarDays className="w-3.5 h-3.5 mr-1" />
                       {item.date}
                    </span>
                  </div>
                  
                  <h3 className="text-base font-semibold text-[#1A2C3E] mt-3.5 group-hover:text-[#1D6F8F] transition-colors leading-[1.6]">
                    {item.title}
                  </h3>
                  
                  <p className="text-[13px] text-[#6C8EA0] line-clamp-2 leading-[1.6] mt-2">
                    {item.content || '暂无正文描述，请点击查阅原文。'}
                  </p>
                </div>
              ))
            ) : (
              <div className="bg-white p-16 rounded-2xl border border-[#E8EEF4] text-center flex flex-col items-center shadow-[0_2px_12px_rgba(29,111,143,0.03)] mt-8">
                <div className="w-16 h-16 bg-[#F5F8FC] rounded-2xl flex items-center justify-center mb-5 text-[#1D6F8F]">
                  <SearchIcon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-[#1A2C3E] mb-2">未找到匹配的结果</h3>
                <p className="text-[14px] text-[#6C8EA0]">请尝试缩短关键字，或重置筛选条件</p>
                <button 
                  onClick={resetFilters}
                  className="mt-6 px-6 py-2.5 bg-[#1D6F8F] hover:bg-[#155A75] text-white rounded-xl text-[13px] font-semibold transition-colors shadow-sm"
                >
                   清除检索条件
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

