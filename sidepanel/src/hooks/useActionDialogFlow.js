import { useState } from 'react';
import { worldService } from '../services/world.service.ts';
import { bookService } from '../services/book.service.ts';
import { authService } from '../services/auth.service.ts';

export function useActionDialogFlow({
  selectedWorldId,
  setSelectedWorldId,
  setSelectedBookId,
  setAuthSession,
  ensureCloudRuntimeReady,
  refreshRuntimeContext,
  onDataChanged,
  onUiMessage
}) {
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [actionDialog, setActionDialog] = useState({
    open: false,
    type: '',
    title: '',
    message: '',
    fields: [],
    confirmText: '确定',
    cancelText: '取消'
  });
  const [actionDialogValues, setActionDialogValues] = useState({});

  const openActionDialog = (config) => {
    const safeFields = Array.isArray(config?.fields) ? config.fields : [];
    const nextValues = {};
    safeFields.forEach((field) => {
      nextValues[field.key] = String(field.defaultValue || '');
    });
    setActionDialog({
      open: true,
      type: config?.type || '',
      title: config?.title || '操作确认',
      message: config?.message || '',
      fields: safeFields,
      confirmText: config?.confirmText || '确定',
      cancelText: config?.cancelText || '取消'
    });
    setActionDialogValues(nextValues);
  };

  const closeActionDialog = () => {
    setActionDialog((prev) => ({ ...prev, open: false }));
    setActionDialogValues({});
    setDialogSubmitting(false);
  };

  const updateDialogField = (key, value) => {
    setActionDialogValues((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmitActionDialog = async () => {
    if (dialogSubmitting) return;
    setDialogSubmitting(true);

    try {
      if (actionDialog.type === 'create_world') {
        const name = String(actionDialogValues.name || '').trim();
        if (!name) {
          onUiMessage?.('世界名称不能为空', 'warning');
          setDialogSubmitting(false);
          return;
        }
        const result = await worldService.createWorld(name, '');
        if (!result?.success || !result?.data) {
          onUiMessage?.('创建世界失败，请稍后重试', 'error');
          setDialogSubmitting(false);
          return;
        }
        setSelectedWorldId(result.data.id);
        setSelectedBookId('');
        await onDataChanged?.();
        onUiMessage?.('世界创建成功', 'success');
        closeActionDialog();
        return;
      }

      if (actionDialog.type === 'create_book') {
        if (!selectedWorldId) {
          onUiMessage?.('请先选择或创建一个世界', 'warning');
          setDialogSubmitting(false);
          return;
        }
        const title = String(actionDialogValues.title || '').trim();
        if (!title) {
          onUiMessage?.('书项目名称不能为空', 'warning');
          setDialogSubmitting(false);
          return;
        }
        const result = await bookService.createBook(selectedWorldId, title, '');
        if (!result?.success || !result?.data) {
          onUiMessage?.('创建书项目失败，请稍后重试', 'error');
          setDialogSubmitting(false);
          return;
        }
        setSelectedBookId(result.data.id);
        await onDataChanged?.();
        onUiMessage?.('书项目创建成功', 'success');
        closeActionDialog();
        return;
      }

      if (actionDialog.type === 'login_cloud') {
        const email = String(actionDialogValues.email || '').trim();
        const password = String(actionDialogValues.password || '');
        if (!email || !password) {
          onUiMessage?.('邮箱和密码不能为空', 'warning');
          setDialogSubmitting(false);
          return;
        }
        const loginResult = await authService.login(email, password);
        if (!loginResult?.success) {
          onUiMessage?.('登录失败，请检查账号信息', 'error');
          setDialogSubmitting(false);
          return;
        }
        const profileResult = await authService.getCurrentUser();
        if (profileResult?.success && profileResult?.data) {
          setAuthSession({
            userId: profileResult.data.id,
            email: profileResult.data.email,
            plan: profileResult.data.plan || 'free'
          });
        }
        await refreshRuntimeContext();
        await onDataChanged?.();
        onUiMessage?.('云端登录成功', 'success');
        closeActionDialog();
        return;
      }

      if (actionDialog.type === 'register_cloud') {
        const email = String(actionDialogValues.email || '').trim();
        const password = String(actionDialogValues.password || '');
        const confirmPassword = String(actionDialogValues.confirmPassword || '');
        if (!email || !password || !confirmPassword) {
          onUiMessage?.('请填写所有必填字段', 'warning');
          setDialogSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          onUiMessage?.('两次输入的密码不一致', 'warning');
          setDialogSubmitting(false);
          return;
        }
        const registerResult = await authService.register(email, password);
        if (!registerResult?.success) {
          onUiMessage?.('注册失败，请稍后重试', 'error');
          setDialogSubmitting(false);
          return;
        }
        const profileResult = await authService.getCurrentUser();
        if (profileResult?.success && profileResult?.data) {
          setAuthSession({
            userId: profileResult.data.id,
            email: profileResult.data.email,
            plan: profileResult.data.plan || 'free'
          });
        }
        await refreshRuntimeContext();
        await onDataChanged?.();
        onUiMessage?.('注册成功', 'success');
        closeActionDialog();
        return;
      }

      setDialogSubmitting(false);
    } catch (error) {
      console.error('[Sidepanel] handleSubmitActionDialog error:', error);
      onUiMessage?.('操作失败，请稍后重试', 'error');
      setDialogSubmitting(false);
    }
  };

  const handleAddWorld = () => {
    openActionDialog({
      type: 'create_world',
      title: '新建世界',
      message: '创建一个世界，用来整理作品和设定。',
      fields: [
        {
          key: 'name',
          label: '世界名称',
          placeholder: '例如：星环纪元'
        }
      ],
      confirmText: '创建世界'
    });
  };

  const handleAddBook = () => {
    if (!selectedWorldId) {
      onUiMessage?.('请先选择或创建一个世界', 'warning');
      return;
    }
    openActionDialog({
      type: 'create_book',
      title: '新建书项目',
      message: '书项目用来整理当前世界下的内容。',
      fields: [
        {
          key: 'title',
          label: '书项目名称',
          placeholder: '例如：夜宴疑云'
        }
      ],
      confirmText: '创建书项目'
    });
  };

  const handleSignIn = async () => {
    const ready = await ensureCloudRuntimeReady();
    if (!ready) return;
    openActionDialog({
      type: 'login_cloud',
      title: '登录账号',
      message: '登录后可开启云同步。',
      fields: [
        {
          key: 'email',
          label: '邮箱',
          placeholder: 'name@example.com'
        },
        {
          key: 'password',
          label: '密码',
          type: 'password',
          placeholder: '请输入密码'
        }
      ],
      confirmText: '登录'
    });
  };

  const handleRegister = async () => {
    const ready = await ensureCloudRuntimeReady();
    if (!ready) return;
    openActionDialog({
      type: 'register_cloud',
      title: '注册账号',
      message: '注册后可开启云同步。',
      fields: [
        {
          key: 'email',
          label: '邮箱',
          placeholder: 'name@example.com'
        },
        {
          key: 'password',
          label: '密码',
          type: 'password',
          placeholder: '请输入密码'
        },
        {
          key: 'confirmPassword',
          label: '确认密码',
          type: 'password',
          placeholder: '请再次输入密码'
        }
      ],
      confirmText: '注册'
    });
  };

  return {
    actionDialog,
    actionDialogValues,
    dialogSubmitting,
    closeActionDialog,
    updateDialogField,
    handleSubmitActionDialog,
    handleAddWorld,
    handleAddBook,
    handleSignIn,
    handleRegister
  };
}
