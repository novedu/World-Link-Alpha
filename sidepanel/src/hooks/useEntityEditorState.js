import { useState } from 'react';
import { normalizeAssistProfile } from '../utils/assistUtils';

export function useEntityEditorState() {
  const [editingEntity, setEditingEntity] = useState(null);
  const [isSavingEntity, setIsSavingEntity] = useState(false);
  const [isAiAssisting, setIsAiAssisting] = useState(false);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSubmittingAiFeedback, setIsSubmittingAiFeedback] = useState(false);
  const [aiAssistMeta, setAiAssistMeta] = useState(null);
  const [aiAssistProfile, setAiAssistProfile] = useState(() => normalizeAssistProfile());
  const [conflictCheckMeta, setConflictCheckMeta] = useState(null);

  return {
    editingEntity,
    setEditingEntity,
    isSavingEntity,
    setIsSavingEntity,
    isAiAssisting,
    setIsAiAssisting,
    isCheckingConflict,
    setIsCheckingConflict,
    isGeneratingImage,
    setIsGeneratingImage,
    isSubmittingAiFeedback,
    setIsSubmittingAiFeedback,
    aiAssistMeta,
    setAiAssistMeta,
    aiAssistProfile,
    setAiAssistProfile,
    conflictCheckMeta,
    setConflictCheckMeta
  };
}