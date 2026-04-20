import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorldQuickView, WorldMetricsView, WorldActivityView, WorldRelationView } from './WorldSummaryCard';

describe('WorldQuickView', () => {
  const mockWorldRows = [
    { worldId: '1', worldName: '测试世界1', entities: 10, relations: 15, books: 2 },
    { worldId: '2', worldName: '测试世界2', entities: 5, relations: 3, books: 1 }
  ];
  
  it('renders empty state when no world rows', () => {
    render(
      <WorldQuickView 
        worldQuickRows={[]} 
        selectedWorldId={null} 
        onQuickJumpWorld={vi.fn()} 
      />
    );
    
    expect(screen.getByText('还没有世界数据')).toBeInTheDocument();
  });
  
  it('renders world quick rows correctly', () => {
    render(
      <WorldQuickView 
        worldQuickRows={mockWorldRows} 
        selectedWorldId='1' 
        onQuickJumpWorld={vi.fn()} 
      />
    );
    
    expect(screen.getByText('测试世界1')).toBeInTheDocument();
    expect(screen.getByText('测试世界2')).toBeInTheDocument();
    expect(screen.getByText('高活跃')).toBeInTheDocument();
    expect(screen.getByText('中活跃')).toBeInTheDocument();
  });
  
  it('calls onQuickJumpWorld when switch button is clicked', () => {
    const onQuickJumpWorld = vi.fn();
    
    render(
      <WorldQuickView 
        worldQuickRows={mockWorldRows} 
        selectedWorldId='1' 
        onQuickJumpWorld={onQuickJumpWorld} 
      />
    );
    
    const switchButtons = screen.getAllByText('切换');
    fireEvent.click(switchButtons[0]);
    
    expect(onQuickJumpWorld).toHaveBeenCalledWith('2');
  });
});

describe('WorldMetricsView', () => {
  it('renders empty state when no distribution rows', () => {
    render(
      <WorldMetricsView 
        distributionRows={[]} 
        recentEntities={[]} 
        recentCaptures={[]} 
      />
    );
    
    expect(screen.getByText('还没有类型数据')).toBeInTheDocument();
  });
  
  it('renders distribution rows correctly', () => {
    const mockDistributionRows = [
      { type: 'character', label: '人物', count: 10 },
      { type: 'location', label: '地点', count: 5 }
    ];
    
    render(
      <WorldMetricsView 
        distributionRows={mockDistributionRows} 
        recentEntities={[]} 
        recentCaptures={[]} 
      />
    );
    
    expect(screen.getByText('人物')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('地点')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

describe('WorldActivityView', () => {
  it('renders empty state when no recent activity', () => {
    render(
      <WorldActivityView 
        recentEntities={[]} 
        recentCaptures={[]} 
        onGoToTimelineTab={vi.fn()} 
      />
    );
    
    expect(screen.getByText('还没有最近动态')).toBeInTheDocument();
  });
  
  it('renders recent entities and captures', () => {
    const mockEntities = [
      { id: '1', name: '测试人物', type: 'character', updatedAt: Date.now() }
    ];
    
    const mockCaptures = [
      { text: '测试灵感', timestamp: Date.now(), sourceTitle: '测试来源' }
    ];
    
    render(
      <WorldActivityView 
        recentEntities={mockEntities} 
        recentCaptures={mockCaptures} 
        onGoToTimelineTab={vi.fn()} 
      />
    );
    
    expect(screen.getByText('设定更新 · 测试人物')).toBeInTheDocument();
    expect(screen.getByText('灵感记录 · 测试灵感')).toBeInTheDocument();
  });
  
  it('calls onGoToTimelineTab when button is clicked', () => {
    const onGoToTimelineTab = vi.fn();
    
    render(
      <WorldActivityView 
        recentEntities={[]} 
        recentCaptures={[]} 
        onGoToTimelineTab={onGoToTimelineTab} 
      />
    );
    
    const button = screen.getByText('打开时间轴');
    fireEvent.click(button);
    
    expect(onGoToTimelineTab).toHaveBeenCalled();
  });
});

describe('WorldRelationView', () => {
  it('renders empty state when no relations', () => {
    render(
      <WorldRelationView 
        relationScope="world"
        onRelationScopeChange={vi.fn()}
        overviewBookGraphId=""
        onOverviewBookGraphChange={vi.fn()}
        worldRelationCount={0}
        worldRelationTypeRows={[]}
        worldRelationPreviewRows={[]}
        worldRelationGraphEdges={[]}
        bookRelationCount={0}
        bookRelationTypeRows={[]}
        bookRelationPreviewRows={[]}
        bookRelationGraphEdges={[]}
        selectedBookId=""
        booksInWorld={[]}
      />
    );
    
    expect(screen.getByText('还没有关系')).toBeInTheDocument();
  });
  
  it('switches between world and book scope', () => {
    const onRelationScopeChange = vi.fn();
    
    render(
      <WorldRelationView 
        relationScope="world"
        onRelationScopeChange={onRelationScopeChange}
        overviewBookGraphId=""
        onOverviewBookGraphChange={vi.fn()}
        worldRelationCount={5}
        worldRelationTypeRows={[]}
        worldRelationPreviewRows={[]}
        worldRelationGraphEdges={[]}
        bookRelationCount={3}
        bookRelationTypeRows={[]}
        bookRelationPreviewRows={[]}
        bookRelationGraphEdges={[]}
        selectedBookId="book1"
        booksInWorld={[{ id: 'book1', title: '测试作品' }]}
      />
    );
    
    const bookScopeButton = screen.getByText('作品视角');
    fireEvent.click(bookScopeButton);
    
    expect(onRelationScopeChange).toHaveBeenCalledWith('book');
  });
});
