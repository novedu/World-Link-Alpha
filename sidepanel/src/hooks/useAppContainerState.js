import { useState, useRef } from 'react';

export function useAppContainerState() {
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [entityTagFilter, setEntityTagFilter] = useState('');
  const [activeTab, setActiveTab] = useState('entities');
  const [captureStatusFilter, setCaptureStatusFilter] = useState('all');
  const [captureSourceFilter, setCaptureSourceFilter] = useState('all');
  const [captureTimeFilter, setCaptureTimeFilter] = useState('all');
  const [overviewRelationScope, setOverviewRelationScope] = useState('book');
  const [overviewBookGraphId, setOverviewBookGraphId] = useState('');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isActivationDebugOpen, setIsActivationDebugOpen] = useState(false);
  const [isActivationDebugLoading, setIsActivationDebugLoading] = useState(false);
  const [isActivationDebugExporting, setIsActivationDebugExporting] = useState(false);
  const [activationDebugSnapshot, setActivationDebugSnapshot] = useState(null);
  const [isActivationGuideDismissed, setIsActivationGuideDismissed] = useState(false);
  const [isOnboardingTourOpen, setIsOnboardingTourOpen] = useState(false);
  const [onboardingTourStepIndex, setOnboardingTourStepIndex] = useState(0);

  const activationSessionIdRef = useRef('');
  const activationMetricsReadyRef = useRef(false);
  const activationPrevDoneMapRef = useRef({});
  const activationPrevCompletedRef = useRef(0);
  const activationCompletedTrackedRef = useRef(false);
  const tourViewedStepIdRef = useRef('');
  const tourOpenStateRef = useRef(false);
  const tourAutoAdvanceSignatureRef = useRef('');
  const tourCompletionNoticeRef = useRef(false);

  return {
    entitySearchQuery,
    setEntitySearchQuery,
    entityTypeFilter,
    setEntityTypeFilter,
    entityTagFilter,
    setEntityTagFilter,
    activeTab,
    setActiveTab,
    captureStatusFilter,
    setCaptureStatusFilter,
    captureSourceFilter,
    setCaptureSourceFilter,
    captureTimeFilter,
    setCaptureTimeFilter,
    overviewRelationScope,
    setOverviewRelationScope,
    overviewBookGraphId,
    setOverviewBookGraphId,
    isAccountModalOpen,
    setIsAccountModalOpen,
    isActivationDebugOpen,
    setIsActivationDebugOpen,
    isActivationDebugLoading,
    setIsActivationDebugLoading,
    isActivationDebugExporting,
    setIsActivationDebugExporting,
    activationDebugSnapshot,
    setActivationDebugSnapshot,
    isActivationGuideDismissed,
    setIsActivationGuideDismissed,
    isOnboardingTourOpen,
    setIsOnboardingTourOpen,
    onboardingTourStepIndex,
    setOnboardingTourStepIndex,
    activationSessionIdRef,
    activationMetricsReadyRef,
    activationPrevDoneMapRef,
    activationPrevCompletedRef,
    activationCompletedTrackedRef,
    tourViewedStepIdRef,
    tourOpenStateRef,
    tourAutoAdvanceSignatureRef,
    tourCompletionNoticeRef
  };
}