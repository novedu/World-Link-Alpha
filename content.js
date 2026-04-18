// ==================== World-Link Alpha - Content Script ====================
// 实现划词采集面板功能

let toastTimer = null;
let capturePanel = null;
let panelData = {
  selectedText: '',
  pageTitle: document.title,
  pageUrl: window.location.href,
  worlds: [],
  books: [],
  selectedWorld: '',
  selectedType: 'other',
  entityName: '',
  summary: '',
  tags: '',
  selectedBooks: []
};

// ==================== Toast 提示 ====================
function createOrUpdateToast(text, isError = false) {
  try {
    const id = 'wl-toast-minimal';
    let toast = document.getElementById(id);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = id;
      toast.style.cssText = [
        'position:fixed',
        'left:50%',
        'bottom:56px',
        'transform:translateX(-50%)',
        'z-index:2147483647',
        'background:#ffffff',
        'color:#0f172a',
        'padding:8px 16px',
        'border-radius:999px',
        'border:1px solid #e2e8f0',
        'font-size:12px',
        'font-family:Plus Jakarta Sans,Segoe UI,PingFang SC,sans-serif',
        'display:flex',
        'align-items:center',
        'gap:8px',
        'box-shadow:0 8px 24px rgba(15,23,42,0.16)',
        'pointer-events:none',
        'transition:opacity 0.2s ease'
      ].join(';');
      const icon = document.createElement('span');
      icon.textContent = isError ? '!' : '✓';
      icon.style.color = isError ? '#ef4444' : '#10b981';
      icon.style.fontSize = '14px';
      icon.style.fontWeight = 'bold';
      const span = document.createElement('span');
      span.id = id + '-text';
      toast.appendChild(icon);
      toast.appendChild(span);
      document.documentElement.appendChild(toast);
    }
    const textSpan = document.getElementById(id + '-text');
    if (textSpan) {
      textSpan.textContent = text;
    }
    toast.style.opacity = '1';
  } catch (err) {
    console.error('[Content] Toast create error:', err);
  }
}

function showToast(text, isError = false) {
  createOrUpdateToast(text || '', isError);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    const toast = document.getElementById('wl-toast-minimal');
    if (toast) {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }
    toastTimer = null;
  }, 2500);
}

// ==================== 采集面板 ====================
function createCapturePanel() {
  try {
    closeCapturePanel();
    const id = 'wl-capture-panel';
    capturePanel = document.createElement('div');
    capturePanel.id = id;
    capturePanel.style.cssText = [
        'position:fixed',
        'top:50%',
        'left:50%',
        'transform:translate(-50%, -50%)',
        'z-index:2147483647',
        'background:var(--bg-card, #ffffff)',
        'color:var(--text-primary, #0f172a)',
        'padding:24px',
        'border-radius:12px',
        'border:1px solid var(--border-default, #e2e8f0)',
        'box-shadow:0 20px 42px rgba(15,23,42,0.22)',
        'width:90vw',
        'max-width:500px',
        'max-height:80vh',
        'overflow-y:auto',
        'font-family:Plus Jakarta Sans,Segoe UI,PingFang SC,sans-serif'
      ].join(';');

    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = [
      'position:absolute',
      'top:12px',
      'right:12px',
      'background:#f8fafc',
      'border:1px solid #e2e8f0',
      'color:#64748b',
      'font-size:20px',
      'cursor:pointer',
      'padding:0 8px',
      'border-radius:8px',
      'transition:all 120ms ease-in-out'
    ].join(';');
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = '#eef2ff';
      closeButton.style.borderColor = '#cbd5e1';
      closeButton.style.color = '#334155';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = '#f8fafc';
      closeButton.style.borderColor = '#e2e8f0';
      closeButton.style.color = '#64748b';
    });
    closeButton.addEventListener('click', closeCapturePanel);
    capturePanel.appendChild(closeButton);

    // 标题
    const title = document.createElement('h3');
    title.textContent = '存入 World-Link';
    title.style.cssText = [
      'margin:0 0 20px 0',
      'font-size:18px',
      'font-weight:600',
      'color:#0f172a'
    ].join(';');
    capturePanel.appendChild(title);

    // 选中文本预览
    const textPreview = document.createElement('div');
    textPreview.style.cssText = [
      'background:#f8fafc',
      'border-radius:8px',
      'padding:12px',
      'margin-bottom:20px',
      'font-size:14px',
      'line-height:1.4',
      'max-height:120px',
      'overflow:auto'
    ].join(';');
    const previewText = document.createElement('p');
    previewText.textContent = panelData.selectedText.length > 200 
      ? panelData.selectedText.substring(0, 200) + '...' 
      : panelData.selectedText;
    previewText.style.margin = '0';
    textPreview.appendChild(previewText);
    capturePanel.appendChild(textPreview);

    // 来源信息
    const sourceInfo = document.createElement('div');
    sourceInfo.style.cssText = [
      'font-size:12px',
      'color:#64748b',
      'margin-bottom:20px',
      'display:flex',
      'flex-direction:column',
      'gap:4px'
    ].join(';');
    const sourceTitle = document.createElement('div');
    sourceTitle.textContent = `来源：${panelData.pageTitle}`;
    sourceInfo.appendChild(sourceTitle);
    const sourceUrl = document.createElement('div');
    sourceUrl.textContent = panelData.pageUrl.length > 50 
      ? panelData.pageUrl.substring(0, 50) + '...' 
      : panelData.pageUrl;
    sourceInfo.appendChild(sourceUrl);
    capturePanel.appendChild(sourceInfo);

    // 表单
    const form = document.createElement('form');
    form.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'gap:16px'
    ].join(';');

    // 世界选择
    const worldGroup = document.createElement('div');
    const worldLabel = document.createElement('label');
    worldLabel.textContent = '世界 *';
    worldLabel.style.cssText = [
      'display:block',
      'font-size:14px',
      'font-weight:500',
      'margin-bottom:6px',
      'color:#334155'
    ].join(';');
    worldGroup.appendChild(worldLabel);
    const worldSelect = document.createElement('select');
    worldSelect.id = 'wl-world-select';
    worldSelect.style.cssText = [
      'width:100%',
      'min-height:36px',
      'padding:8px 12px',
      'border-radius:8px',
      'border:1px solid #e2e8f0',
      'background:#ffffff',
      'color:#0f172a',
      'font-size:14px',
      'transition:border-color 120ms ease, box-shadow 120ms ease'
    ].join(';');
    worldSelect.innerHTML = '<option value="">选择世界...</option>';
    panelData.worlds.forEach(world => {
      const option = document.createElement('option');
      option.value = world.id;
      option.textContent = world.name;
      if (world.id === panelData.selectedWorld) {
        option.selected = true;
      }
      worldSelect.appendChild(option);
    });
    worldSelect.addEventListener('change', (e) => {
      panelData.selectedWorld = e.target.value;
      updateBooksList();
    });
    worldGroup.appendChild(worldSelect);
    form.appendChild(worldGroup);

    // 实体类型
    const typeGroup = document.createElement('div');
    const typeLabel = document.createElement('label');
    typeLabel.textContent = '实体类型 *';
    typeLabel.style.cssText = [
      'display:block',
      'font-size:14px',
      'font-weight:500',
      'margin-bottom:6px',
      'color:#334155'
    ].join(';');
    typeGroup.appendChild(typeLabel);
    const typeSelect = document.createElement('select');
    typeSelect.id = 'wl-type-select';
    typeSelect.style.cssText = [
      'width:100%',
      'min-height:36px',
      'padding:8px 12px',
      'border-radius:8px',
      'border:1px solid #e2e8f0',
      'background:#ffffff',
      'color:#0f172a',
      'font-size:14px',
      'transition:border-color 120ms ease, box-shadow 120ms ease'
    ].join(';');
    const types = [
      { value: 'character', label: '人物' },
      { value: 'location', label: '地点/地理' },
      { value: 'faction', label: '势力/组织' },
      { value: 'item', label: '物品/武器/道具' },
      { value: 'mineral', label: '矿石/资源' },
      { value: 'creature', label: '生物/怪物' },
      { value: 'event', label: '事件' },
      { value: 'law', label: '规则/世界法则' },
      { value: 'other', label: '其他' }
    ];
    types.forEach(type => {
      const option = document.createElement('option');
      option.value = type.value;
      option.textContent = type.label;
      if (type.value === panelData.selectedType) {
        option.selected = true;
      }
      typeSelect.appendChild(option);
    });
    typeSelect.addEventListener('change', (e) => {
      panelData.selectedType = e.target.value;
    });
    typeGroup.appendChild(typeSelect);
    form.appendChild(typeGroup);

    // 名称
    const nameGroup = document.createElement('div');
    const nameLabel = document.createElement('label');
    nameLabel.textContent = '名称 *';
    nameLabel.style.cssText = [
      'display:block',
      'font-size:14px',
      'font-weight:500',
      'margin-bottom:6px',
      'color:#334155'
    ].join(';');
    nameGroup.appendChild(nameLabel);
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'wl-name-input';
    nameInput.value = panelData.entityName;
    nameInput.placeholder = '输入实体名称';
    nameInput.style.cssText = [
      'width:100%',
      'min-height:36px',
      'padding:8px 12px',
      'border-radius:8px',
      'border:1px solid #e2e8f0',
      'background:#ffffff',
      'color:#0f172a',
      'font-size:14px',
      'transition:border-color 120ms ease, box-shadow 120ms ease'
    ].join(';');
    nameInput.addEventListener('input', (e) => {
      panelData.entityName = e.target.value;
    });
    nameGroup.appendChild(nameInput);
    form.appendChild(nameGroup);

    // 所属书项目
    const booksGroup = document.createElement('div');
    const booksLabel = document.createElement('label');
    booksLabel.textContent = '所属书项目（可选）';
    booksLabel.style.cssText = [
      'display:block',
      'font-size:14px',
      'font-weight:500',
      'margin-bottom:6px',
      'color:#334155'
    ].join(';');
    booksGroup.appendChild(booksLabel);
    const booksContainer = document.createElement('div');
    booksContainer.id = 'wl-books-container';
    booksContainer.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'gap:8px'
    ].join(';');
    updateBooksList();
    booksGroup.appendChild(booksContainer);
    form.appendChild(booksGroup);

    // 简要描述
    const summaryGroup = document.createElement('div');
    const summaryLabel = document.createElement('label');
    summaryLabel.textContent = '简要描述（可选）';
    summaryLabel.style.cssText = [
      'display:block',
      'font-size:14px',
      'font-weight:500',
      'margin-bottom:6px',
      'color:#334155'
    ].join(';');
    summaryGroup.appendChild(summaryLabel);
    const summaryTextarea = document.createElement('textarea');
    summaryTextarea.id = 'wl-summary-input';
    summaryTextarea.value = panelData.summary;
    summaryTextarea.placeholder = '输入简要描述';
    summaryTextarea.style.cssText = [
      'width:100%',
      'padding:8px 12px',
      'border-radius:8px',
      'border:1px solid #e2e8f0',
      'background:#ffffff',
      'color:#0f172a',
      'font-size:14px',
      'min-height:80px',
      'resize:vertical',
      'transition:border-color 120ms ease, box-shadow 120ms ease'
    ].join(';');
    summaryTextarea.addEventListener('input', (e) => {
      panelData.summary = e.target.value;
    });
    summaryGroup.appendChild(summaryTextarea);
    form.appendChild(summaryGroup);

    // 标签
    const tagsGroup = document.createElement('div');
    const tagsLabel = document.createElement('label');
    tagsLabel.textContent = '标签（可选，用逗号分隔）';
    tagsLabel.style.cssText = [
      'display:block',
      'font-size:14px',
      'font-weight:500',
      'margin-bottom:6px',
      'color:#334155'
    ].join(';');
    tagsGroup.appendChild(tagsLabel);
    const tagsInput = document.createElement('input');
    tagsInput.type = 'text';
    tagsInput.id = 'wl-tags-input';
    tagsInput.value = panelData.tags;
    tagsInput.placeholder = '例如：矿石, 资源, 危险';
    tagsInput.style.cssText = [
      'width:100%',
      'min-height:36px',
      'padding:8px 12px',
      'border-radius:8px',
      'border:1px solid #e2e8f0',
      'background:#ffffff',
      'color:#0f172a',
      'font-size:14px',
      'transition:border-color 120ms ease, box-shadow 120ms ease'
    ].join(';');
    tagsInput.addEventListener('input', (e) => {
      panelData.tags = e.target.value;
    });
    tagsGroup.appendChild(tagsInput);
    form.appendChild(tagsGroup);

    // 错误提示
    const errorMessage = document.createElement('div');
    errorMessage.id = 'wl-error-message';
    errorMessage.style.cssText = [
      'color:#f87171',
      'font-size:12px',
      'margin-top:8px',
      'display:none'
    ].join(';');
    form.appendChild(errorMessage);

    // 操作按钮
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = [
      'display:flex',
      'gap:12px',
      'justify-content:flex-end',
      'margin-top:16px'
    ].join(';');
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = '取消';
    cancelButton.style.cssText = [
      'padding:8px 16px',
      'border-radius:8px',
      'border:1px solid var(--border-default, #e2e8f0)',
      'background:var(--bg-card, #ffffff)',
      'color:var(--text-primary, #0f172a)',
      'font-size:14px',
      'cursor:pointer',
      'transition:all 120ms ease-in-out'
    ].join(';');
    cancelButton.addEventListener('mouseenter', () => {
      cancelButton.style.background = 'var(--bg-soft, #f8fafc)';
      cancelButton.style.borderColor = '#cbd5e1';
    });
    cancelButton.addEventListener('mouseleave', () => {
      cancelButton.style.background = 'var(--bg-card, #ffffff)';
      cancelButton.style.borderColor = 'var(--border-default, #e2e8f0)';
    });
    cancelButton.addEventListener('click', closeCapturePanel);
    buttonsContainer.appendChild(cancelButton);
    const saveButton = document.createElement('button');
    saveButton.id = 'wl-save-button';
    saveButton.type = 'button';
    saveButton.textContent = '保存';
    saveButton.style.cssText = [
      'padding:8px 16px',
      'border-radius:8px',
      'border:none',
      'background:var(--primary, #2563eb)',
      'color:white',
      'font-size:14px',
      'font-weight:500',
      'cursor:pointer',
      'transition:all 120ms ease-in-out',
      'min-width:88px'
    ].join(';');
    saveButton.addEventListener('mouseenter', () => {
      saveButton.style.background = 'var(--primary-hover, #1D4ED8)';
    });
    saveButton.addEventListener('mouseleave', () => {
      saveButton.style.background = 'var(--primary, #2563eb)';
    });
    saveButton.addEventListener('click', saveEntity);
    buttonsContainer.appendChild(saveButton);
    form.appendChild(buttonsContainer);

    capturePanel.appendChild(form);
    document.documentElement.appendChild(capturePanel);

    // 背景遮罩
    const overlay = document.createElement('div');
    overlay.id = 'wl-overlay';
    overlay.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'right:0',
      'bottom:0',
      'background:rgba(15,23,42,0.28)',
      'z-index:2147483646',
      'backdrop-filter:blur(4px)'
    ].join(';');
    overlay.addEventListener('click', closeCapturePanel);
    document.documentElement.appendChild(overlay);

    // 键盘事件
    document.addEventListener('keydown', handleKeyDown);

  } catch (err) {
    console.error('[Content] Create capture panel error:', err);
    showToast('创建采集面板失败', true);
  }
}

function updateBooksList() {
  const booksContainer = document.getElementById('wl-books-container');
  if (!booksContainer) return;

  booksContainer.innerHTML = '';
  const booksInSelectedWorld = panelData.books.filter(book => book.worldId === panelData.selectedWorld);

  if (booksInSelectedWorld.length === 0) {
    const noBooks = document.createElement('div');
    noBooks.textContent = '当前世界暂无书项目';
    noBooks.style.cssText = [
      'font-size:12px',
      'color:#64748b',
      'padding:8px',
      'background:#f8fafc',
      'border-radius:4px'
    ].join(';');
    booksContainer.appendChild(noBooks);
    return;
  }

  booksInSelectedWorld.forEach(book => {
    const bookItem = document.createElement('div');
    bookItem.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:8px'
    ].join(';');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = book.id;
    checkbox.checked = panelData.selectedBooks.includes(book.id);
    checkbox.style.cssText = [
      'width:16px',
      'height:16px',
      'accent-color:#3b82f6'
    ].join(';');
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        if (!panelData.selectedBooks.includes(book.id)) {
          panelData.selectedBooks.push(book.id);
        }
      } else {
        panelData.selectedBooks = panelData.selectedBooks.filter(id => id !== book.id);
      }
    });
    bookItem.appendChild(checkbox);
    const label = document.createElement('label');
    label.textContent = book.title;
    label.style.cssText = [
      'font-size:14px',
      'color:#334155',
      'cursor:pointer'
    ].join(';');
    bookItem.appendChild(label);
    booksContainer.appendChild(bookItem);
  });
}

function closeCapturePanel() {
  if (capturePanel) {
    capturePanel.remove();
    capturePanel = null;
  }
  const overlay = document.getElementById('wl-overlay');
  if (overlay) {
    overlay.remove();
  }
  document.removeEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    closeCapturePanel();
  } else if (e.key === 'Enter' && e.ctrlKey) {
    saveEntity();
  }
}

function saveEntity() {
  const saveButton = document.getElementById('wl-save-button');
  // 验证
  if (!panelData.selectedWorld) {
    showError('请选择世界');
    return;
  }
  if (!panelData.entityName) {
    showError('请输入实体名称');
    return;
  }

  // 设置加载状态
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = '保存中...';
    saveButton.style.opacity = '0.7';
    saveButton.style.cursor = 'not-allowed';
  }

  // 准备数据
  const entityData = {
    worldId: panelData.selectedWorld,
    type: panelData.selectedType,
    name: panelData.entityName,
    summary: panelData.summary,
    tags: panelData.tags ? panelData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
    sourceUrl: panelData.pageUrl,
    sourceTitle: panelData.pageTitle,
    selectedText: panelData.selectedText,
    selectedBooks: panelData.selectedBooks
  };

  // 发送到后台
  chrome.runtime.sendMessage(
    { type: 'SAVE_ENTITY', data: entityData },
    (response) => {
      // 恢复按钮状态
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.style.opacity = '1';
        saveButton.style.cursor = 'pointer';
      }

      if (response && response.success) {
        const worldName = panelData.worlds.find(w => w.id === panelData.selectedWorld)?.name || '未知';
        saveButton.textContent = '保存成功！';
        showToast(`✅ 已保存到「${worldName}」`);
        setTimeout(() => {
          closeCapturePanel();
        }, 500);
      } else {
        saveButton.textContent = '保存';
        const errorMsg = response?.error || '保存失败，请稍后重试';
        showError(errorMsg);
        console.error('[Content] Save error:', response);
      }
    }
  );
}

function showError(message) {
  const errorElement = document.getElementById('wl-error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
  showToast(message, true);
}

// ==================== 消息监听 ====================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'OPEN_CAPTURE_PANEL') {
      // 初始化数据
      panelData = {
        ...panelData,
        pageTitle: document.title,
        pageUrl: window.location.href,
        selectedText: message.data.selectedText || '',
        worlds: message.data.worlds || [],
        books: message.data.books || [],
        selectedWorld: message.data.lastUsedWorld || '',
        entityName: message.data.suggestedName || message.data.selectedText || '',
        selectedType: message.data.suggestedType || 'other',
        summary: message.data.suggestedSummary || '',
        tags: message.data.suggestedTags?.join(', ') || '',
        selectedBooks: []
      };
      createCapturePanel();
      sendResponse?.({ success: true });
      return true;
    }
  } catch (error) {
    console.error('[Content] onMessage error:', error);
    showToast('处理消息失败', true);
  }
  return false;
});

console.log('[Content] World-Link Alpha 内容脚本已加载（带采集面板）');
