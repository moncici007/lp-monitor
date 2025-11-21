import { useState, useEffect } from 'react';
import Head from 'next/head';
import useSWR from 'swr';
import StatsOverview from '../components/StatsOverview';
import PoolList from '../components/PoolList';
import RecentTransactions from '../components/RecentTransactions';
import AlertList from '../components/AlertList';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function Home() {
  const [selectedChain, setSelectedChain] = useState('all');
  const [activeTab, setActiveTab] = useState('pools');

  // 获取统计摘要
  const { data: summaryData, error: summaryError } = useSWR(
    '/api/stats/summary',
    fetcher,
    { refreshInterval: 5000 }
  );

  // 获取池子列表
  const { data: poolsData, error: poolsError } = useSWR(
    selectedChain === 'all' 
      ? '/api/pools/list' 
      : `/api/pools/list?chain=${selectedChain}`,
    fetcher,
    { refreshInterval: 5000 }
  );

  // 获取最近交易
  const { data: transactionsData, error: transactionsError } = useSWR(
    selectedChain === 'all'
      ? '/api/transactions/recent?limit=20'
      : `/api/transactions/recent?chain=${selectedChain}&limit=20`,
    fetcher,
    { refreshInterval: 5000 }
  );

  // 获取预警列表
  const { data: alertsData, error: alertsError } = useSWR(
    '/api/alerts/list?limit=20',
    fetcher,
    { refreshInterval: 5000 }
  );

  return (
    <div className="container">
      <Head>
        <title>LP Monitor - 实时监控链上流动性池</title>
        <meta name="description" content="实时监控 BSC 和 Solana 流动性池交易" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="header">
        <h1>
          💧 LP Monitor
        </h1>
        <div className="nav">
          <button 
            className={`nav-link ${selectedChain === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedChain('all')}
          >
            全部
          </button>
          <button 
            className={`nav-link ${selectedChain === 'bsc' ? 'active' : ''}`}
            onClick={() => setSelectedChain('bsc')}
          >
            BSC
          </button>
          <button 
            className={`nav-link ${selectedChain === 'solana' ? 'active' : ''}`}
            onClick={() => setSelectedChain('solana')}
          >
            Solana
          </button>
        </div>
      </div>

      {/* 统计概览 */}
      <StatsOverview data={summaryData} />

      {/* 标签页导航 */}
      <div style={{ marginBottom: '20px' }}>
        <div className="nav">
          <button 
            className={`nav-link ${activeTab === 'pools' ? 'active' : ''}`}
            onClick={() => setActiveTab('pools')}
          >
            流动性池
          </button>
          <button 
            className={`nav-link ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            最近交易
          </button>
          <button 
            className={`nav-link ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            预警
            {alertsData?.unread_count > 0 && (
              <span className="alert-badge" style={{ marginLeft: '8px' }}>
                {alertsData.unread_count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {activeTab === 'pools' && (
        <PoolList 
          data={poolsData} 
          error={poolsError}
          selectedChain={selectedChain}
        />
      )}

      {activeTab === 'transactions' && (
        <RecentTransactions 
          data={transactionsData} 
          error={transactionsError}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertList 
          data={alertsData} 
          error={alertsError}
        />
      )}

      {/* 页脚 */}
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 0', 
        color: '#71767b',
        fontSize: '14px'
      }}>
        <p>LP Monitor - 实时监控链上流动性池交易</p>
        <p style={{ marginTop: '8px' }}>
          数据每 5 秒自动刷新
        </p>
      </div>
    </div>
  );
}

