import { useCallback, useEffect, useMemo } from 'react';

export function useOnboardingTour({
  worlds,
  books,
  entities,
  selectedWorldId,
  handleAddWorld,
  handleAddBook,
  openEntityTab,
  selectFirstWorld,
  isOnboardingTourOpen,
  setIsOnboardingTourOpen,
  onboardingTourStepIndex,
  setOnboardingTourStepIndex,
  activationMetricsReadyRef,
  trackActivation,
  showUiMessage,
  findFirstIncompleteStepIndex,
  findNextIncompleteStepIndex,
  tourOpenStateRef,
  tourViewedStepIdRef,
  tourAutoAdvanceSignatureRef,
  tourCompletionNoticeRef
}) {
  // 引导步骤的完成态与业务状态强绑定：
  // 已创建世界/作品/设定即视为完成，确保引导不会和真实数据冲突。
  const hasWorld = worlds.length > 0;
  const hasBook = books.length > 0;
  const hasEntity = entities.length > 0;

  const onboardingTourSteps = useMemo(() => ([
    {
      id: 'tour-world-selector',
      targetSelector: '[data-tour-id="world-selector"]',
      title: '先确定工作上下文',
      description: '这里决定"你现在在编辑哪个世界观库"和"当前作品"。',
      done: Boolean(selectedWorldId),
      actionLabel: !selectedWorldId && hasWorld ? '自动切到首个世界' : '',
      onAction: () => {
        if (!selectedWorldId && hasWorld) {
          selectFirstWorld();
        }
      }
    },
    {
      id: 'tour-add-world',
      targetSelector: '[data-tour-id="add-world-btn"]',
      title: '创建你的第一个世界观库',
      description: '先建一个世界，后续设定和作品都会归到这里。',
      done: hasWorld,
      actionLabel: '立即创建世界',
      onAction: handleAddWorld
    },
    {
      id: 'tour-add-book',
      targetSelector: '[data-tour-id="add-book-btn"]',
      title: '创建当前作品',
      description: '作品用于区分"这本书实际用到的设定"。',
      done: hasBook,
      actionLabel: hasWorld ? '立即创建作品' : '先创建世界',
      onAction: hasWorld ? handleAddBook : handleAddWorld
    },
    {
      id: 'tour-entity-tab',
      targetSelector: '[data-tour-id="tab-entities"]',
      title: '设定管理',
      description: '在这里管理所有设定，支持搜索、筛选、编辑和关系管理。',
      done: hasEntity,
      actionLabel: hasWorld ? '去新建设定' : '先创建世界',
      onAction: hasWorld ? () => {
        openEntityTab();
      } : handleAddWorld
    },
    {
      id: 'tour-capture-tab',
      targetSelector: '[data-tour-id="tab-captures"]',
      title: '灵感记录',
      description: '网页划词采集的灵感会自动出现在这里。',
      done: true,
      actionLabel: '查看灵感记录',
      onAction: () => {}
    },
    {
      id: 'tour-overview-tab',
      targetSelector: '[data-tour-id="tab-overview"]',
      title: '概览面板',
      description: '查看世界统计、关系图谱和最近动态。',
      done: true,
      actionLabel: '查看概览',
      onAction: () => {}
    }
  ]), [
    selectedWorldId,
    handleAddWorld,
    handleAddBook,
    openEntityTab,
    selectFirstWorld,
    hasWorld,
    hasBook,
    hasEntity
  ]);

  const areAllOnboardingStepsDone = useMemo(() => {
    return onboardingTourSteps.every((step) => step.done);
  }, [onboardingTourSteps]);

  // Tour 开启后，永远把当前步骤对齐到“首个未完成步骤”，
  // 避免用户卡在已完成步骤上反复点击下一步。
  const effectiveOnboardingTourStepIndex = useMemo(() => {
    if (!isOnboardingTourOpen) return onboardingTourStepIndex;
    return findFirstIncompleteStepIndex(onboardingTourSteps);
  }, [isOnboardingTourOpen, onboardingTourStepIndex, onboardingTourSteps, findFirstIncompleteStepIndex]);

  const isOnboardingTourVisible = isOnboardingTourOpen && onboardingTourSteps.length > 0;

  const openOnboardingTour = useCallback(() => {
    if (!isOnboardingTourOpen) {
      setIsOnboardingTourOpen(true);
    }
  }, [isOnboardingTourOpen, setIsOnboardingTourOpen]);

  const closeOnboardingTour = useCallback(() => {
    if (isOnboardingTourOpen) {
      setIsOnboardingTourOpen(false);
    }
  }, [isOnboardingTourOpen, setIsOnboardingTourOpen]);

  const nextOnboardingTourStep = useCallback(() => {
    const fromIndex = effectiveOnboardingTourStepIndex;
    const toIndex = findNextIncompleteStepIndex(onboardingTourSteps, fromIndex);
    if (toIndex === -1 || toIndex === fromIndex) return;

    trackActivation('tour_next', {
      fromStepIndex: fromIndex,
      toStepIndex: toIndex,
      fromStepId: onboardingTourSteps[fromIndex]?.id || '',
      toStepId: onboardingTourSteps[toIndex]?.id || ''
    });
    setOnboardingTourStepIndex(toIndex);
  }, [
    effectiveOnboardingTourStepIndex,
    onboardingTourSteps,
    findNextIncompleteStepIndex,
    trackActivation,
    setOnboardingTourStepIndex
  ]);

  const prevOnboardingTourStep = useCallback(() => {
    const fromIndex = effectiveOnboardingTourStepIndex;
    const toIndex = Math.max(0, fromIndex - 1);
    if (toIndex === fromIndex) return;

    trackActivation('tour_prev', {
      fromStepIndex: fromIndex,
      toStepIndex: toIndex,
      fromStepId: onboardingTourSteps[fromIndex]?.id || '',
      toStepId: onboardingTourSteps[toIndex]?.id || ''
    });
    setOnboardingTourStepIndex(toIndex);
  }, [
    effectiveOnboardingTourStepIndex,
    onboardingTourSteps,
    trackActivation,
    setOnboardingTourStepIndex
  ]);

  const runOnboardingTourStepAction = (stepInput) => {
    const fallbackStep = onboardingTourSteps[effectiveOnboardingTourStepIndex];
    const step = stepInput || fallbackStep;
    if (!step || typeof step.onAction !== 'function') return;

    const stepIndex = onboardingTourSteps.findIndex((item) => item.id === step.id);
    trackActivation('tour_step_action', {
      stepId: step.id,
      stepTitle: step.title,
      stepIndex: stepIndex >= 0 ? stepIndex : effectiveOnboardingTourStepIndex
    });
    step.onAction();
  };

  // 记录 Tour 打开/关闭事件，便于分析引导入口到退出的漏斗。
  useEffect(() => {
    if (!activationMetricsReadyRef.current) return;
    const wasOpen = tourOpenStateRef.current;

    if (!wasOpen && isOnboardingTourVisible) {
      const step = onboardingTourSteps[effectiveOnboardingTourStepIndex];
      trackActivation('tour_opened', {
        stepId: step?.id || '',
        stepIndex: effectiveOnboardingTourStepIndex
      });
    }

    if (wasOpen && !isOnboardingTourVisible) {
      trackActivation('tour_closed', {
        stepId: onboardingTourSteps[effectiveOnboardingTourStepIndex]?.id || '',
        stepIndex: effectiveOnboardingTourStepIndex
      });
      tourViewedStepIdRef.current = '';
    }

    tourOpenStateRef.current = isOnboardingTourVisible;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnboardingTourVisible, effectiveOnboardingTourStepIndex, onboardingTourSteps, trackActivation]);

  // 记录“步骤被看到”事件；同一步只记一次，避免滚动/重渲染重复埋点。
  useEffect(() => {
    if (!activationMetricsReadyRef.current || !isOnboardingTourVisible) return;

    const step = onboardingTourSteps[effectiveOnboardingTourStepIndex];
    const stepId = String(step?.id || '');
    if (!stepId || tourViewedStepIdRef.current === stepId) return;

    tourViewedStepIdRef.current = stepId;
    trackActivation('tour_step_viewed', {
      stepId,
      stepTitle: step?.title || '',
      stepIndex: effectiveOnboardingTourStepIndex,
      done: Boolean(step?.done)
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnboardingTourVisible, effectiveOnboardingTourStepIndex, onboardingTourSteps, trackActivation]);

  // 自动推进埋点：当外部业务状态变化导致步骤跳转时，记录 from/to。
  // signature 用于防抖，避免同一次状态变化反复上报。
  useEffect(() => {
    if (!activationMetricsReadyRef.current || !isOnboardingTourVisible || onboardingTourSteps.length === 0) {
      tourAutoAdvanceSignatureRef.current = '';
      return;
    }

    const maxIndex = Math.max(0, onboardingTourSteps.length - 1);
    const fromStepIndex = Math.max(0, Math.min(onboardingTourStepIndex, maxIndex));
    const toStepIndex = Math.max(0, Math.min(effectiveOnboardingTourStepIndex, maxIndex));
    if (fromStepIndex === toStepIndex) {
      tourAutoAdvanceSignatureRef.current = '';
      return;
    }

    const signature = `${fromStepIndex}->${toStepIndex}|${onboardingTourSteps.map((step) => (step.done ? '1' : '0')).join('')}`;
    if (tourAutoAdvanceSignatureRef.current === signature) return;
    tourAutoAdvanceSignatureRef.current = signature;

    trackActivation('tour_auto_advance', {
      fromStepId: onboardingTourSteps[fromStepIndex]?.id || '',
      fromStepIndex,
      toStepId: onboardingTourSteps[toStepIndex]?.id || '',
      toStepIndex,
      reason: 'step_completed'
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOnboardingTourVisible,
    onboardingTourStepIndex,
    effectiveOnboardingTourStepIndex,
    onboardingTourSteps,
    trackActivation
  ]);

  // 全部完成后给出一次性提示，并发送“all_completed”事件。
  useEffect(() => {
    if (!activationMetricsReadyRef.current) return;
    if (!isOnboardingTourOpen) {
      tourCompletionNoticeRef.current = false;
      return;
    }
    if (!areAllOnboardingStepsDone || tourCompletionNoticeRef.current) return;

    tourCompletionNoticeRef.current = true;
    trackActivation('tour_auto_advance', {
      fromStepId: onboardingTourSteps[effectiveOnboardingTourStepIndex]?.id || '',
      fromStepIndex: effectiveOnboardingTourStepIndex,
      toStepId: '',
      toStepIndex: -1,
      reason: 'all_completed'
    });
    showUiMessage('引导已完成，你可以直接进入高频创作。', 'success');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOnboardingTourOpen,
    areAllOnboardingStepsDone,
    onboardingTourSteps,
    effectiveOnboardingTourStepIndex,
    trackActivation,
    showUiMessage
  ]);

  const onboardingTour = {
    open: isOnboardingTourVisible,
    currentStepIndex: effectiveOnboardingTourStepIndex,
    steps: onboardingTourSteps
  };

  return {
    onboardingTour,
    openOnboardingTour,
    closeOnboardingTour,
    nextOnboardingTourStep,
    prevOnboardingTourStep,
    runOnboardingTourStepAction
  };
}
