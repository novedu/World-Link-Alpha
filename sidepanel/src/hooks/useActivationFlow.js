import { useCallback, useEffect, useMemo } from 'react';

// 找到第一步“未完成”步骤，用于引导默认落点。
function findFirstIncompleteStepIndex(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return 0;
  const index = steps.findIndex((step) => !step?.done);
  return index >= 0 ? index : 0;
}

// 从当前步骤向后找下一个“未完成”步骤，用于自动推进。
function findNextIncompleteStepIndex(steps, fromIndex) {
  if (!Array.isArray(steps) || steps.length === 0) return -1;
  for (let index = Math.max(0, fromIndex + 1); index < steps.length; index += 1) {
    if (!steps[index]?.done) return index;
  }
  return -1;
}

export function useActivationFlow({
  worlds,
  books,
  entities,
  capturedList,
  bookEntityUsages,
  selectedWorldId,
  selectedBookId,
  handleAddWorld,
  handleAddBook,
  handleStartNewEntity,
  openEntityTab,
  openCaptureTab,
  selectFirstWorld,
  selectFirstBook,
  showUiMessage,
  activationMetricsReadyRef,
  activationPrevDoneMapRef,
  activationPrevCompletedRef,
  activationCompletedTrackedRef,
  trackActivation
}) {
  // 五步激活的完成态来自真实业务数据，不做额外“临时状态”缓存，
  // 这样可以保证激活卡与真实数据一致。
  const hasWorld = worlds.length > 0;
  const hasBook = books.length > 0;
  const hasEntity = entities.length > 0;
  const hasCapture = capturedList.length > 0;
  const hasBookUsage = bookEntityUsages.length > 0;

  const handleActivationCreateEntity = useCallback(() => {
    const worldId = String(selectedWorldId || '').trim() || selectFirstWorld();
    if (!worldId) return;
    openEntityTab();
    handleStartNewEntity();
  }, [selectedWorldId, selectFirstWorld, openEntityTab, handleStartNewEntity]);

  const handleActivationCollectCapture = useCallback(() => {
    openCaptureTab();
    showUiMessage('在任意网页划词后右键"存入 World-Link"，即可回到灵感记录查看。', 'info');
  }, [openCaptureTab, showUiMessage]);

  const handleActivationBindBookUsage = useCallback(() => {
    if (worlds.length === 0) {
      handleAddWorld();
      return;
    }
    const worldId = String(selectedWorldId || '').trim() || selectFirstWorld();
    if (!worldId) return;

    if (books.length === 0) {
      handleAddBook();
      return;
    }
    const bookId = String(selectedBookId || '').trim() || selectFirstBook();
    if (!bookId) return;

    openEntityTab();
    if (entities.length === 0) {
      handleStartNewEntity();
      return;
    }

    showUiMessage('打开任一设定，勾选"用于当前作品"并保存，即可完成绑定。', 'info');
  }, [
    worlds.length,
    selectedWorldId,
    selectFirstWorld,
    books.length,
    selectedBookId,
    selectFirstBook,
    openEntityTab,
    entities.length,
    handleStartNewEntity,
    handleAddWorld,
    handleAddBook,
    showUiMessage
  ]);

  const activationSteps = useMemo(() => ([
    {
      id: 'create-world',
      title: '创建第一个世界观库',
      description: '这是你所有设定的主容器。',
      done: hasWorld,
      actionLabel: '+ 新建世界',
      onAction: handleAddWorld
    },
    {
      id: 'create-book',
      title: '创建当前作品',
      description: '用于隔离本书正在使用的设定。',
      done: hasBook,
      actionLabel: hasWorld ? '+ 新建作品' : '先建世界',
      onAction: hasWorld ? handleAddBook : handleAddWorld
    },
    {
      id: 'create-entity',
      title: '创建第一条设定',
      description: '建议先建主角或主舞台，便于后续关联。',
      done: hasEntity,
      actionLabel: '去新建设定',
      onAction: handleActivationCreateEntity
    },
    {
      id: 'capture-inspiration',
      title: '采集一条灵感记录',
      description: '在网页划词右键"存入 World-Link"。',
      done: hasCapture,
      actionLabel: '查看灵感记录',
      onAction: handleActivationCollectCapture
    },
    {
      id: 'bind-book-usage',
      title: '完成设定与作品绑定',
      description: '让"只看本书用到的设定"筛选立即可用。',
      done: hasBookUsage,
      actionLabel: '去完成绑定',
      onAction: handleActivationBindBookUsage
    }
  ]), [
    hasWorld,
    hasBook,
    hasEntity,
    hasCapture,
    hasBookUsage,
    handleAddWorld,
    handleAddBook,
    handleActivationCreateEntity,
    handleActivationCollectCapture,
    handleActivationBindBookUsage
  ]);

  const activationCompletedCount = activationSteps.filter((step) => step.done).length;
  const activationTotalCount = activationSteps.length;
  const activationProgressPercent = activationTotalCount > 0
    ? Math.round((activationCompletedCount / activationTotalCount) * 100)
    : 0;

  // 只在激活指标会话准备完成后，追踪“步骤完成”和“全部完成”事件。
  // 通过 prev refs 做 diff，避免重复上报同一步骤。
  useEffect(() => {
    if (!activationMetricsReadyRef.current) return;

    const doneMap = activationSteps.reduce((map, step) => {
      map[step.id] = step.done;
      return map;
    }, {});

    const prevCompletedCount = activationPrevCompletedRef.current;
    const currentCompletedCount = activationCompletedCount;

    if (currentCompletedCount > prevCompletedCount) {
      activationSteps.forEach((step) => {
        const wasDone = activationPrevDoneMapRef.current[step.id];
        const isDone = step.done;
        if (!wasDone && isDone) {
          trackActivation('activation_step_completed', {
            stepId: step.id,
            stepTitle: step.title,
            stepIndex: activationSteps.findIndex((s) => s.id === step.id),
            completedCount: currentCompletedCount,
            totalCount: activationTotalCount
          });
        }
      });

      if (currentCompletedCount === activationTotalCount && !activationCompletedTrackedRef.current) {
        activationCompletedTrackedRef.current = true;
        trackActivation('activation_completed', {
          totalCount: activationTotalCount,
          completedCount: currentCompletedCount
        });
      }
    }

    activationPrevDoneMapRef.current = doneMap;
    activationPrevCompletedRef.current = currentCompletedCount;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activationSteps, activationCompletedCount, activationTotalCount, activationMetricsReadyRef, trackActivation]);

  return {
    activationSteps,
    activationCompletedCount,
    activationTotalCount,
    activationProgressPercent,
    findFirstIncompleteStepIndex,
    findNextIncompleteStepIndex
  };
}
