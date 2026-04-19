import { useState, useEffect, useMemo } from 'react';
import { http } from '../lib/http/client';
import EmptyStateCard from './EmptyStateCard';

function formatTimelineTime(timestamp) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const EVENT_TYPE_LABELS = {
  status_change: '状态变化',
  relationship_change: '关系变化',
  creation: '创建',
  update: '更新',
  other: '其他'
};

function TimelineSection({
  currentWorld,
  currentEntity,
  entitiesInWorld = [],
  onChangeField,
  relationOptions = [],
  relationLabels = {}
}) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newEvent, setNewEvent] = useState({
    eventType: 'status_change',
    title: '',
    description: '',
    timestamp: new Date().toISOString()
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRelationPanel, setShowRelationPanel] = useState(false);
  const [relationDraft, setRelationDraft] = useState({
    targetEntityId: '',
    relationType: 'related_to',
    note: ''
  });

  useEffect(() => {
    if (currentWorld && currentWorld.id) {
      loadWorldEvents(currentWorld.id);
    }
  }, [currentWorld]);

  useEffect(() => {
    if (currentEntity && currentEntity.id) {
      loadEntityEvents(currentEntity.id);
    }
  }, [currentEntity]);

  const loadWorldEvents = async (worldId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.get(`/timeline/worlds/${worldId}/events`);
      if (response.success && response.data) {
        setEvents(response.data);
      }
    } catch (err) {
      setError('加载时间轴事件失败');
      console.error('Error loading world timeline events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEntityEvents = async (entityId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.get(`/timeline/entities/${entityId}/events`);
      if (response.success && response.data) {
        setEvents(response.data);
      }
    } catch (err) {
      setError('加载实体时间轴事件失败');
      console.error('Error loading entity timeline events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = async (event) => {
    event.preventDefault();
    if (!currentWorld || !newEvent.title) return;

    setIsLoading(true);
    setError(null);
    try {
      const eventData = {
        worldId: currentWorld.id,
        entityId: currentEntity?.id || '',
        eventType: newEvent.eventType,
        title: newEvent.title,
        description: newEvent.description,
        timestamp: newEvent.timestamp
      };

      const response = await http.post('/timeline/events', eventData);
      if (response.success && response.data) {
        setEvents(prev => [response.data, ...prev]);
        setNewEvent({
          eventType: 'status_change',
          title: '',
          description: '',
          timestamp: new Date().toISOString()
        });
        setShowAddForm(false);
      }
    } catch (err) {
      setError('添加时间轴事件失败');
      console.error('Error adding timeline event:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('确定要删除这个时间轴事件吗？')) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await http.delete(`/timeline/events/${eventId}`);
      if (response.success) {
        setEvents(prev => prev.filter(event => event.id !== eventId));
      }
    } catch (err) {
      setError('删除时间轴事件失败');
      console.error('Error deleting timeline event:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const validateRelation = (targetId, relationType) => {
    if (!currentEntity || !currentEntity.id) {
      return { valid: false, error: '当前没有正在编辑的设定' };
    }
    if (!targetId) {
      return { valid: false, error: '请选择目标设定' };
    }
    if (targetId === currentEntity.id) {
      return { valid: false, error: '不能将设定关联到自己' };
    }
    const targetExists = entitiesInWorld.some(e => e.id === targetId);
    if (!targetExists) {
      return { valid: false, error: '目标设定不存在' };
    }
    const existingRelations = currentEntity.relations || [];
    const isDuplicate = existingRelations.some(
      rel => rel.toEntityId === targetId && rel.type === relationType
    );
    if (isDuplicate) {
      return { valid: false, error: '该关系已存在，请勿重复添加' };
    }
    return { valid: true };
  };

  const handleApplyRelation = () => {
    if (!currentEntity || !onChangeField) return;

    const validation = validateRelation(relationDraft.targetEntityId, relationDraft.relationType);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const targetEntity = entitiesInWorld.find(e => e.id === relationDraft.targetEntityId);
    const newRelation = {
      id: `rel-${Date.now()}`,
      toEntityId: relationDraft.targetEntityId,
      type: relationDraft.relationType,
      note: relationDraft.note || `通过时间轴事件添加：${newEvent.title}`
    };

    const existingRelations = currentEntity.relations || [];
    const updatedRelations = [...existingRelations, newRelation];
    onChangeField('relations', updatedRelations);

    alert(`关系添加成功：${currentEntity.name} ${relationLabels[relationDraft.relationType] || relationDraft.relationType} ${targetEntity?.name || ''}`);

    setRelationDraft({
      targetEntityId: '',
      relationType: 'related_to',
      note: ''
    });
    setShowRelationPanel(false);
  };

  const handleFillDraft = () => {
    if (!currentEntity || !onChangeField) return;

    const validation = validateRelation(relationDraft.targetEntityId, relationDraft.relationType);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const targetEntity = entitiesInWorld.find(e => e.id === relationDraft.targetEntityId);

    setRelationDraft({
      targetEntityId: relationDraft.targetEntityId,
      relationType: relationDraft.relationType,
      note: relationDraft.note || ''
    });

    alert(`关系草稿已填充到编辑器：${currentEntity.name} → ${targetEntity?.name || ''}`);
  };

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [events]);

  const availableTargets = useMemo(() => {
    if (!currentEntity) return entitiesInWorld;
    return entitiesInWorld.filter(e => e.id !== currentEntity.id);
  }, [entitiesInWorld, currentEntity]);

  return (
    <div className="section-body">
      <div className="section-header">
        <h2 className="section-title">时间轴状态演化（v1）</h2>
        <div className="section-actions">
          {currentEntity && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowRelationPanel(!showRelationPanel)}
            >
              {showRelationPanel ? '收起' : '添加关系'}
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '取消' : '添加事件'}
          </button>
        </div>
      </div>

      {showRelationPanel && currentEntity && (
        <div className="relation-panel">
          <div className="relation-panel-header">
            <h3>为「{currentEntity.name}」添加关系</h3>
          </div>
          <div className="relation-panel-body">
            <div className="form-group">
              <label className="field-label">目标设定</label>
              <select
                className="field-input"
                value={relationDraft.targetEntityId}
                onChange={(e) => setRelationDraft({ ...relationDraft, targetEntityId: e.target.value })}
              >
                <option value="">选择目标设定...</option>
                {availableTargets.map(entity => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name} ({entity.type || 'other'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="field-label">关系类型</label>
              <select
                className="field-input"
                value={relationDraft.relationType}
                onChange={(e) => setRelationDraft({ ...relationDraft, relationType: e.target.value })}
              >
                {relationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="field-label">备注（可选）</label>
              <input
                type="text"
                className="field-input"
                value={relationDraft.note}
                onChange={(e) => setRelationDraft({ ...relationDraft, note: e.target.value })}
                placeholder="添加关系备注..."
              />
            </div>

            <div className="relation-panel-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleApplyRelation}
              >
                一键添加关系
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleFillDraft}
              >
                填充到编辑器草稿
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="form-card">
          <form onSubmit={handleAddEvent}>
            <div className="form-group">
              <label className="field-label">事件类型</label>
              <select
                className="field-input"
                value={newEvent.eventType}
                onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value })}
              >
                <option value="status_change">状态变化</option>
                <option value="relationship_change">关系变化</option>
                <option value="creation">创建</option>
                <option value="update">更新</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div className="form-group">
              <label className="field-label">事件标题</label>
              <input
                type="text"
                className="field-input"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="输入事件标题"
                required
              />
            </div>

            <div className="form-group">
              <label className="field-label">事件描述</label>
              <textarea
                className="field-input"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="输入事件描述"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="field-label">时间</label>
              <input
                type="datetime-local"
                className="field-input"
                value={newEvent.timestamp.slice(0, 16)}
                onChange={(e) => setNewEvent({ ...newEvent, timestamp: e.target.value + ':00.000Z' })}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? '添加中...' : '添加事件'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="loading-indicator">
          加载中...
        </div>
      ) : sortedEvents.length > 0 ? (
        <div className="timeline-container">
          {sortedEvents.map((event) => (
            <div key={event.id} className="timeline-event">
              <div className="timeline-event-header">
                <div className="timeline-event-title">
                  <span className="tag tag-primary">
                    {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                  </span>
                  <span>{event.title}</span>
                </div>
                <div className="timeline-event-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-mini"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
              {event.description && (
                <div className="timeline-event-description">
                  {event.description}
                </div>
              )}
              <div className="timeline-event-meta">
                <span className="timeline-event-time">
                  {formatTimelineTime(event.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          icon="时"
          title="暂无可展示的时间轴事件"
          description="添加事件来记录设定的状态演化。"
          actions={[
            {
              label: '添加事件',
              onClick: () => setShowAddForm(true)
            }
          ]}
        />
      )}
    </div>
  );
}

export default TimelineSection;
