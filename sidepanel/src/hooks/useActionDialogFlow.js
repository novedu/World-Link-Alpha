import { useState } from 'react';
import { formatRuntimeError, sendRuntimeMessage } from '../services/runtimeApi';

export function useActionDialogFlow({
  selectedWorldId,
  setSelectedWorldId,
  setSelectedBookId,
  authSession,
  setAuthSession,
  ensureCloudRuntimeReady,
  refreshRuntimeContext,
  onUiMessage
}) {
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [isMigratingLocalData, setIsMigratingLocalData] = useState(false);
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
        const result = await sendRuntimeMessage('CREATE_WORLD', { name });
        if (!result?.success) {
          onUiMessage?.(formatRuntimeError(result, '创建世界失败'), 'error');
          setDialogSubmitting(false);
          return;
        }
        setSelectedWorldId(result.world.id);
        setSelectedBookId('');
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
        const result = await sendRuntimeMessage('CREATE_BOOK', {
          worldId: selectedWorldId,
          title
        });
        if (!result?.success) {
          onUiMessage?.(formatRuntimeError(result, '创建书项目失败'), 'error');
          setDialogSubmitting(false);
          return;
        }
        setSelectedBookId(result.book.id);
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
        const result = await sendRuntimeMessage('SIGN_IN_WITH_PASSWORD', {
          email,
          password
        });
        if (!result?.success) {
          onUiMessage?.(formatRuntimeError(result, '云端登录失败'), 'error');
          setDialogSubmitting(false);
          return;
        }
        setAuthSession(result.session || null);
        await refreshRuntimeContext();
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
        const result = await sendRuntimeMessage('REGISTER_WITH_PASSWORD', {
          email,
          password
        });
        if (!result?.success) {
          onUiMessage?.(formatRuntimeError(result, '注册失败'), 'error');
          setDialogSubmitting(false);
          return;
        }
        setAuthSession(result.session || null);
        await refreshRuntimeContext();
        onUiMessage?.('注册成功', 'success');
        closeActionDialog();
        return;
      }

      if (actionDialog.type === 'migrate_local_to_cloud') {
        setIsMigratingLocalData(true);
        const result = await sendRuntimeMessage('MIGRATE_LOCAL_TO_CLOUD', {
          strategy: 'merge',
          clearLocalAfterImport: false
        });
        setIsMigratingLocalData(false);
        if (!result?.success) {
          onUiMessage?.(formatRuntimeError(result, '迁移失败'), 'error');
          setDialogSubmitting(false);
          return;
        }
        const migrated = result.migrated || {};
        onUiMessage?.(
          `迁移完成：世界 ${migrated.worlds || 0}，书 ${migrated.books || 0}，实体 ${migrated.entities || 0}，捕获 ${
            migrated.captures || 0
          }`,
          'success'
        );
        await refreshRuntimeContext();
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
      message: '创建一个新的世界容器，用于承载书项目与实体。',
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
      message: '书项目用于组织当前世界下的创作视图。',
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
      message: '登录后自动开启云端同步，可跨设备访问你的世界资产。',
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
      message: '注册账号后可开启云端同步，跨设备访问你的世界资产。',
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

  const handleMigrateLocalToCloud = async () => {
    if (isMigratingLocalData) return;
    if (!authSession?.email) {
      onUiMessage?.('请先登录账号，再执行数据迁移', 'warning');
      return;
    }
    const ready = await ensureCloudRuntimeReady();
    if (!ready) return;
    openActionDialog({
      type: 'migrate_local_to_cloud',
      title: '迁移本机数据到云端',
      message:
        '将把当前本机世界/书/实体/捕获数据合并迁移到云端。此操作不会清空本机数据，可重复执行。',
      fields: [],
      confirmText: '开始迁移',
      cancelText: '取消'
    });
  };

  return {
    actionDialog,
    actionDialogValues,
    dialogSubmitting,
    isMigratingLocalData,
    closeActionDialog,
    updateDialogField,
    handleSubmitActionDialog,
    handleAddWorld,
    handleAddBook,
    handleSignIn,
    handleRegister,
    handleMigrateLocalToCloud
  };
}
