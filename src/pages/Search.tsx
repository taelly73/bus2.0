import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, ArrowLeft, Filter, FileText, Clock, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import { getBusData } from '../lib/dataParser';

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
    return !lowerText.includes(term);
  }
  
  return lowerText.includes(q.toLowerCase());
};

export const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const data = getBusData();

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
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
              筛选条件
            </h2>
            
            <form onSubmit={handleSearch} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold mb-2 text-[#6C8EA0] uppercase tracking-wider">关键词检索</label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C8EA0]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="输入检索词..."
                    className="w-full pl-9 pr-3 py-2.5 border border-[#E8EEF4] rounded-xl focus:ring-2 focus:ring-[#1D6F8F]/20 focus:border-[#1D6F8F] transition-colors text-[13px] bg-[#F5F8FC] outline-none"
                  />
                </div>
              </div>

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

              <div className="flex flex-col gap-3 pt-3 mt-2 border-t border-[#E8EEF4]">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1D6F8F] hover:bg-[#155A75] text-white rounded-xl text-[13px] font-semibold transition-colors shadow-sm"
                >
                  应用筛选
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
        <div className="flex-1 w-full">
          <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <h2 className="text-[14px] text-[#6C8EA0]">
              共检索到 <strong className="text-[#1A2C3E] font-bold mx-1 text-[16px]">{results.length}</strong> 条记录 
              {currentCategory && <span className="ml-1 text-[13px] bg-[#E8EEF4] px-2 py-0.5 rounded text-[#1D6F8F]">{currentCategory}</span>} 
              {currentQuery && <span className="ml-1 text-[13px]">包含关键字: "{currentQuery}"</span>}
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
