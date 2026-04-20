import { useEffect, useMemo, useState } from 'react';
import { http } from '../lib/http/client.ts';
import ActionDialog from './ActionDialog';
import EmptyStateCard from './EmptyStateCard';
import InlineMessage from './InlineMessage';

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
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [uiMessage, setUiMessage] = useState(null);
  const [pendingDeleteEventId, setPendingDeleteEventId] = useState('');
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

  const showMessage = (text, type = 'info') => {
    setUiMessage({ text, type });
  };

  const loadWorldEvents = async (worldId) => {
    setIsFetchingEvents(true);
    setLoadError(null);
    try {
      const response = await http.get(`/timeline/worlds/${worldId}/events`);
      if (response.success && response.data) {
        setEvents(response.data);
      }
    } catch (err) {
      setLoadError('加载时间轴失败，请稍后重试。');
      console.error('Error loading world timeline events:', err);
    } finally {
      setIsFetchingEvents(false);
    }
  };

  const loadEntityEvents = async (entityId) => {
    setIsFetchingEvents(true);
    setLoadError(null);
    try {
      const response = await http.get(`/timeline/entities/${entityId}/events`);
      if (response.success && response.data) {
        setEvents(response.data);
      }
    } catch (err) {
      setLoadError('加载时间轴失败，请稍后重试。');
      console.error('Error loading entity timeline events:', err);
    } finally {
      setIsFetchingEvents(false);
    }
  };

  useEffect(() => {
    if (currentEntity?.id) {
      void loadEntityEvents(currentEntity.id);
      return;
    }
    if (currentWorld?.id) {
      void loadWorldEvents(currentWorld.id);
      return;
    }
    setEvents([]);
    setLoadError(null);
  }, [currentWorld?.id, currentEntity?.id]);

  const reloadActiveScope = () => {
    if (currentEntity?.id) {
      void loadEntityEvents(currentEntity.id);
      return;
    }
    if (currentWorld?.id) {
      void loadWorldEvents(currentWorld.id);
    }
  };

  const handleAddEvent = async (event) => {
    event.preventDefault();
    if (!currentWorld) {
      showMessage('请先选择世界，再添加事件。', 'warning');
      return;
    }

    if (!String(newEvent.title || '').trim()) {
      showMessage('请填写事件标题。', 'warning');
      return;
    }

    setIsSubmittingEvent(true);
    setUiMessage(null);
    try {
      const eventData = {
        worldId: currentWorld.id,
        entityId: currentEntity?.id || '',
        eventType: newEvent.eventType,
        title: String(newEvent.title || '').trim(),
        description: newEvent.description,
        timestamp: newEvent.timestamp
      };

      const response = await http.post('/timeline/events', eventData);
      if (response.success && response.data) {
        setEvents((prev) => [response.data, ...prev]);
        setNewEvent({
          eventType: 'status_change',
          title: '',
          description: '',
          timestamp: new Date().toISOString()
        });
        setShowAddForm(false);
        showMessage('事件已添加。', 'success');
      }
    } catch (err) {
      showMessage('添加失败，请稍后重试。', 'error');
      console.error('Error adding timeline event:', err);
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const handleConfirmDeleteEvent = async () => {
    if (!pendingDeleteEventId) return;

    setDeletingEventId(pendingDeleteEventId);
    setUiMessage(null);
    try {
      const response = await http.delete(`/timeline/events/${pendingDeleteEventId}`);
      if (response.success) {
        setEvents((prev) => prev.filter((event) => event.id !== pendingDeleteEventId));
        showMessage('事件已删除。', 'success');
      }
    } catch (err) {
      showMessage('删除失败，请稍后重试。', 'error');
      console.error('Error deleting timeline event:', err);
    } finally {
      setDeletingEventId('');
      setPendingDeleteEventId('');
    }
  };

  const validateRelation = (targetId, relationType) => {
    if (!currentEntity || !currentEntity.id) {
      return { valid: false, error: '请先打开一个设定。' };
    }
    if (!targetId) {
      return { valid: false, error: '请选择目标设定。' };
    }
    if (targetId === currentEntity.id) {
      return { valid: false, error: '不能关联自己。' };
    }
    const targetExists = entitiesInWorld.some((entity) => entity.id === targetId);
    if (!targetExists) {
      return { valid: false, error: '目标设定不存在。' };
    }
    const existingRelations = currentEntity.relations || [];
    const isDuplicate = existingRelations.some(
      (relation) => relation.toEntityId === targetId && relation.type === relationType
    );
    if (isDuplicate) {
      return { valid: false, error: '这条关系已存在。' };
    }
    return { valid: true };
  };

  const handleApplyRelation = () => {
    if (!currentEntity || !onChangeField) return;

    const validation = validateRelation(relationDraft.targetEntityId, relationDraft.relationType);
    if (!validation.valid) {
      showMessage(validation.error, 'warning');
      return;
    }

    const targetEntity = entitiesInWorld.find((entity) => entity.id === relationDraft.targetEntityId);
    const newRelation = {
      id: `rel-${Date.now()}`,
      toEntityId: relationDraft.targetEntityId,
      type: relationDraft.relationType,
      note: relationDraft.note || `通过时间轴事件添加：${newEvent.title}`
    };

    const existingRelations = currentEntity.relations || [];
    const updatedRelations = [...existingRelations, newRelation];
    onChangeField('relations', updatedRelations);

    showMessage(
      `已添加关系：${currentEntity.name} ${relationLabels[relationDraft.relationType] || relationDraft.relationType} ${targetEntity?.name || ''}`,
      'success'
    );

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
      showMessage(validation.error, 'warning');
      return;
    }

    const targetEntity = entitiesInWorld.find((entity) => entity.id === relationDraft.targetEntityId);

    setRelationDraft({
      targetEntityId: relationDraft.targetEntityId,
      relationType: relationDraft.relationType,
      note: relationDraft.note || ''
    });

    showMessage(`已写入草稿：${currentEntity.name} → ${targetEntity?.name || ''}`, 'success');
  };

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [events]);

  const availableTargets = useMemo(() => {
    if (!currentEntity) return entitiesInWorld;
    return entitiesInWorld.filter((entity) => entity.id !== currentEntity.id);
  }, [entitiesInWorld, currentEntity]);

  return (
    <div className="section-body">
      <div className="section-header">
        <h2 className="section-title">时间轴</h2>
        <div className="section-actions">
          {currentEntity ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowRelationPanel(!showRelationPanel)}
            >
              {showRelationPanel ? '收起关系' : '新增关系'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={isSubmittingEvent}
          >
            {showAddForm ? '取消' : '新增事件'}
          </button>
        </div>
      </div>

      <InlineMessage message={uiMessage} onClose={() => setUiMessage(null)} />

      {loadError && sortedEvents.length > 0 ? (
        <div className="inline-message inline-message-error" role="status">
          <span className="inline-message-text">{loadError}</span>
          <button type="button" className="inline-message-close" onClick={() => setLoadError(null)} aria-label="关闭提示">
            ×
          </button>
        </div>
      ) : null}

      {showRelationPanel && currentEntity ? (
        <div className="relation-panel">
          <div className="relation-panel-header">
            <h3>给「{currentEntity.name}」加关系</h3>
          </div>
          <div className="relation-panel-body">
            <div className="form-group">
              <label className="field-label">目标设定</label>
              <select
                className="field-input"
                value={relationDraft.targetEntityId}
                onChange={(event) => setRelationDraft({ ...relationDraft, targetEntityId: event.target.value })}
              >
                <option value="">选择目标设定</option>
                {availableTargets.map((entity) => (
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
                onChange={(event) => setRelationDraft({ ...relationDraft, relationType: event.target.value })}
              >
                {relationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="field-label">备注</label>
              <input
                type="text"
                className="field-input"
                value={relationDraft.note}
                onChange={(event) => setRelationDraft({ ...relationDraft, note: event.target.value })}
                placeholder="填写备注（可选）"
              />
            </div>

            <div className="relation-panel-actions">
              <button type="button" className="btn-primary" onClick={handleApplyRelation}>
                直接添加
              </button>
              <button type="button" className="btn-secondary" onClick={handleFillDraft}>
                写入编辑器
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAddForm ? (
        <div className="form-card">
          <form onSubmit={handleAddEvent}>
            <div className="form-group">
              <label className="field-label">事件类型</label>
              <select
                className="field-input"
                value={newEvent.eventType}
                onChange={(event) => setNewEvent({ ...newEvent, eventType: event.target.value })}
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
                onChange={(event) => setNewEvent({ ...newEvent, title: event.target.value })}
                placeholder="输入标题"
                required
              />
            </div>

            <div className="form-group">
              <label className="field-label">事件描述</label>
              <textarea
                className="field-input"
                value={newEvent.description}
                onChange={(event) => setNewEvent({ ...newEvent, description: event.target.value })}
                placeholder="补充说明（可选）"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="field-label">时间</label>
              <input
                type="datetime-local"
                className="field-input"
                value={newEvent.timestamp.slice(0, 16)}
                onChange={(event) => setNewEvent({ ...newEvent, timestamp: `${event.target.value}:00.000Z` })}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={isSubmittingEvent}>
                {isSubmittingEvent ? '提交中...' : '保存事件'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {isFetchingEvents && sortedEvents.length === 0 ? (
        <div className="status-card status-card-loading">
          <div className="status-card-icon" aria-hidden="true">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600"></div>
          </div>
        <div className="status-card-body">
          <p className="status-card-title">正在加载时间轴</p>
          <p className="status-card-description">正在加载当前范围的事件。</p>
        </div>
      </div>
      ) : loadError && sortedEvents.length === 0 ? (
        <div className="status-card status-card-error">
          <div className="status-card-icon" aria-hidden="true">
            <span>!</span>
          </div>
          <div className="status-card-body">
            <p className="status-card-title">加载失败</p>
            <p className="status-card-description">{loadError}</p>
            <div className="status-card-actions">
              <button type="button" className="btn-secondary btn-mini" onClick={reloadActiveScope}>
                重新加载
              </button>
            </div>
          </div>
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
                  <span className="timeline-event-title-text">{event.title}</span>
                </div>
                <div className="timeline-event-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-mini"
                    onClick={() => setPendingDeleteEventId(event.id)}
                    disabled={deletingEventId === event.id}
                  >
                    {deletingEventId === event.id ? '删除中...' : '删除'}
                  </button>
                </div>
              </div>
              {event.description ? (
                <div className="timeline-event-description">
                  {event.description}
                </div>
              ) : null}
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
          title="还没有时间轴事件"
          description="新增事件后，会按时间显示在这里。"
          actions={[
            {
              label: '新增事件',
              onClick: () => setShowAddForm(true)
            }
          ]}
        />
      )}

      <ActionDialog
        actionDialog={{
          open: Boolean(pendingDeleteEventId),
          title: '删除这条事件？',
          message: '删除后不能恢复。',
          confirmText: '删除',
          cancelText: '取消',
          fields: []
        }}
        actionDialogValues={{}}
        dialogSubmitting={Boolean(deletingEventId)}
        onClose={() => {
          if (!deletingEventId) {
            setPendingDeleteEventId('');
          }
        }}
        onSubmit={handleConfirmDeleteEvent}
        onFieldChange={() => {}}
      />
    </div>
  );
}

export default TimelineSection;
