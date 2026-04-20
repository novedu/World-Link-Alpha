import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrimaryTabBar from './PrimaryTabBar';

describe('PrimaryTabBar', () => {
  it('renders all tab items correctly', () => {
    const onTabChange = vi.fn();
    
    render(
      <PrimaryTabBar 
        activeTab="entities" 
        onTabChange={onTabChange} 
        captureCount={0} 
      />
    );
    
    expect(screen.getByText('设定库')).toBeInTheDocument();
    expect(screen.getByText('灵感箱')).toBeInTheDocument();
    expect(screen.getByText('时间轴')).toBeInTheDocument();
    expect(screen.getByText('总览')).toBeInTheDocument();
  });
  
  it('highlights the active tab', () => {
    const onTabChange = vi.fn();
    
    render(
      <PrimaryTabBar 
        activeTab="captures" 
        onTabChange={onTabChange} 
        captureCount={5} 
      />
    );
    
    const captureTab = screen.getByText('灵感箱').closest('button');
    expect(captureTab).toHaveClass('tab-button-active');
  });
  
  it('shows capture count badge when captureCount > 0', () => {
    const onTabChange = vi.fn();
    
    render(
      <PrimaryTabBar 
        activeTab="entities" 
        onTabChange={onTabChange} 
        captureCount={5} 
      />
    );
    
    expect(screen.getByText('5')).toBeInTheDocument();
  });
  
  it('shows 99+ when captureCount > 99', () => {
    const onTabChange = vi.fn();
    
    render(
      <PrimaryTabBar 
        activeTab="entities" 
        onTabChange={onTabChange} 
        captureCount={150} 
      />
    );
    
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
  
  it('does not show badge when captureCount is 0', () => {
    const onTabChange = vi.fn();
    
    render(
      <PrimaryTabBar 
        activeTab="entities" 
        onTabChange={onTabChange} 
        captureCount={0} 
      />
    );
    
    const badge = screen.queryByText(/\d+|99+/);
    expect(badge).not.toBeInTheDocument();
  });
  
  it('calls onTabChange when tab is clicked', () => {
    const onTabChange = vi.fn();
    
    render(
      <PrimaryTabBar 
        activeTab="entities" 
        onTabChange={onTabChange} 
        captureCount={0} 
      />
    );
    
    const timelineTab = screen.getByText('时间轴').closest('button');
    fireEvent.click(timelineTab);
    
    expect(onTabChange).toHaveBeenCalledWith('timeline');
  });
  
  it('has correct aria attributes', () => {
    const onTabChange = vi.fn();
    
    render(
      <PrimaryTabBar 
        activeTab="overview" 
        onTabChange={onTabChange} 
        captureCount={0} 
      />
    );
    
    const navElement = screen.getByRole('navigation');
    expect(navElement).toHaveAttribute('aria-label', '主导航');
    
    const overviewTab = screen.getByText('总览').closest('button');
    expect(overviewTab).toHaveAttribute('aria-pressed', 'true');
    
    const entitiesTab = screen.getByText('设定库').closest('button');
    expect(entitiesTab).toHaveAttribute('aria-pressed', 'false');
  });
});
