/**
 * AI服务模块
 * ============
 * 
 * 包含所有AI增强功能的类和函数：
 * - AI配置管理
 * - AI响应缓存
 * - AI API客户端
 * - AI服务核心逻辑
 * - AI相关UI交互
 */

// ================================
// AI配置管理器
// ================================

/**
 * AI配置管理器
 * 负责管理AI相关的配置信息，包括API密钥、提供商选择、功能开关等
 */
class AIConfigManager {
    /**
     * 获取AI配置
     * @returns {Object} AI配置对象
     */
    static getConfig() {
        const defaultConfig = {
            enabled: true, // 默认启用AI
            rememberChoice: true, // 默认记住选择
            features: {
                autoClassification: true  // 自动分类功能开关
            },
            apiConfig: {
                provider: 'deepseek',           // AI提供商
                apiKey: '',                     // API密钥
                baseURL: 'https://api.deepseek.com', // API基础地址
                model: 'deepseek-chat'          // 使用的模型
            }
        };
        
        const savedConfig = localStorage.getItem('aiConfig');
        if (savedConfig) {
            return { ...defaultConfig, ...JSON.parse(savedConfig) };
        }
        return defaultConfig;
    }
    
    /**
     * 保存AI配置到localStorage
     * @param {Object} config - 要保存的配置对象
     */
    static saveConfig(config) {
        localStorage.setItem('aiConfig', JSON.stringify(config));
    }
    
    /**
     * 获取可用的AI提供商配置
     * @returns {Object} 包含所有支持的AI提供商配置
     */
    static getProviderConfigs() {
        return {
            deepseek: {
                name: 'DeepSeek (推荐)',
                baseURL: 'https://api.deepseek.com',
                models: [
                    { value: 'deepseek-chat', name: 'deepseek-chat' },
                    { value: 'deepseek-coder', name: 'deepseek-coder' }
                ]
            },
            openai: {
                name: 'OpenAI',
                baseURL: 'https://api.openai.com',
                models: [
                    { value: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
                    { value: 'gpt-4', name: 'GPT-4' },
                    { value: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
                ]
            },
            claude: {
                name: 'Claude',
                baseURL: 'https://api.anthropic.com',
                models: [
                    { value: 'claude-3-haiku', name: 'Claude 3 Haiku' },
                    { value: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
                    { value: 'claude-3-opus', name: 'Claude 3 Opus' }
                ]
            },
            custom: {
                name: '自定义',
                baseURL: '',
                models: [
                    { value: 'custom-model', name: '自定义模型' }
                ]
            }
        };
    }
}

// ================================
// AI响应缓存管理器
// ================================

/**
 * AI响应缓存管理器
 * 负责管理AI API响应的缓存，避免重复调用API，提高性能
 */
class AIResponseManager {
    /**
     * 生成输入文本的哈希值作为缓存键
     * @param {string} text - 输入文本
     * @param {string} type - 请求类型（如'classification'）
     * @returns {string} 16位哈希值
     */
    static hashInput(text, type) {
        return btoa(encodeURIComponent(`${type}:${text}`)).substring(0, 16);
    }
    
    /**
     * 获取有效的缓存响应
     * @param {string} text - 输入文本
     * @param {string} type - 请求类型
     * @returns {string|null} 缓存的响应结果，如果未找到或已过期则返回null
     */
    static getValidResponse(text, type) {
        const responses = JSON.parse(localStorage.getItem('aiResponses') || '{}');
        const hash = this.hashInput(text, type);
        const response = responses[hash];
        
        if (response && new Date(response.expiresAt) > new Date()) {
            return response.output;
        }
        return null;
    }
    
    /**
     * 保存AI响应到缓存
     * @param {string} text - 输入文本
     * @param {string} type - 请求类型
     * @param {string} output - AI响应结果
     * @param {number} expirationHours - 过期时间（小时），默认24小时
     */
    static saveResponse(text, type, output, expirationHours = 24) {
        const responses = JSON.parse(localStorage.getItem('aiResponses') || '{}');
        const hash = this.hashInput(text, type);
        const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
        
        responses[hash] = {
            type,
            input: text,
            output,
            timestamp: new Date().toISOString(),
            expiresAt: expiresAt.toISOString()
        };
        
        localStorage.setItem('aiResponses', JSON.stringify(responses));
    }
}

// ================================
// AI API客户端
// ================================

/**
 * AI API客户端
 * 负责与AI服务提供商的API进行通信
 */
class AIAPIClient {
    /**
     * 构造函数
     * @param {Object} config - API配置对象
     * @param {string} config.apiKey - API密钥
     * @param {string} config.baseURL - API基础地址
     * @param {string} config.model - 使用的模型名称
     */
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseURL = config.baseURL || 'https://api.deepseek.com';
        this.model = config.model || 'deepseek-chat';
    }
    
    /**
     * 发送API请求
     * @param {string} endpoint - API端点
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} API响应结果
     * @throws {Error} 当API密钥未配置或请求失败时抛出错误
     */
    async request(endpoint, data) {
        if (!this.apiKey) {
            throw new Error('API密钥未配置');
        }
        
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        return await response.json();
    }
}

// ================================
// AI服务主类
// ================================

/**
 * AI服务主类
 * 提供各种AI增强功能的核心业务逻辑
 */
class AIService {
    /**
     * 构造函数 - 初始化AI服务
     */
    constructor() {
        const config = AIConfigManager.getConfig();
        this.client = new AIAPIClient(config.apiConfig);
    }
    
    /**
     * 任务分类功能
     * 使用AI分析任务描述，自动分类到[工作,学习,生活,其他]中的一个
     * @param {string} text - 任务描述文本
     * @returns {Promise<string>} 分类结果
     */
    async classifyTask(text) {
        const prompt = `请分析以下任务描述，从[工作,学习,生活,其他]中选择最合适的分类，只返回分类结果：\n${text}`;
        
        const response = await this.client.request('/v1/chat/completions', {
            model: this.client.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 10,
            temperature: 0.1
        });
        
        return this.parseClassificationResponse(response);
    }
    
    /**
     * 解析分类响应
     * @param {Object} response - AI API响应对象
     * @returns {string} 解析后的分类结果
     */
    parseClassificationResponse(response) {
        const content = response.choices[0]?.message?.content || '';
        const validTags = ['工作', '学习', '生活', '其他'];
        
        for (const tag of validTags) {
            if (content.includes(tag)) {
                return tag;
            }
        }
        return '其他'; // 默认分类
    }
    
    /**
     * 任务描述优化功能
     * 使用AI分析用户输入的简单描述，提供更详细、更具可执行性的任务描述建议
     * @param {string} text - 原始任务描述文本
     * @returns {Promise<string>} 优化后的任务描述
     */
    async optimizeTaskDescription(text) {
        const prompt = `请优化以下任务描述，使其更加具体、可执行和明确。

原始描述：${text}

要求：
1. 更加具体和可执行
2. 包含必要的时间、地点、方式等细节
3. 保持简洁明了
4. 只返回优化后的任务描述，不要任何前缀、解释或格式化文字

直接输出优化后的描述：`;
        
        const response = await this.client.request('/v1/chat/completions', {
            model: this.client.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
            temperature: 0.7
        });
        
        return this.parseOptimizationResponse(response);
    }
    
    /**
     * 解析优化响应
     * @param {Object} response - AI API响应对象
     * @returns {string} 解析后的优化结果
     */
    parseOptimizationResponse(response) {
        let content = response.choices[0]?.message?.content || '';
        content = content.trim();
        
        // 移除可能的前缀文字
        const prefixPatterns = [
            /^优化后的描述：?\s*/,
            /^优化建议：?\s*/,
            /^建议：?\s*/,
            /^任务描述：?\s*/,
            /^描述：?\s*/,
            /^优化后：?\s*/,
            /^结果：?\s*/,
            /^答案：?\s*/,
            /^回答：?\s*/,
            /^以下是.*?：?\s*/,
            /^\d+\.\s*/,
            /^[\-\*]\s*/,
            /^「.*?」\s*/,
            /^".*?"\s*/
        ];
        
        for (const pattern of prefixPatterns) {
            content = content.replace(pattern, '');
        }
        
        // 移除可能的引号包围
        content = content.replace(/^["'「『](.*)["'」』]$/, '$1');
        
        return content.trim();
    }
}

// ================================
// AI服务调用函数
// ================================

/**
 * 获取AI任务分类建议
 * 每次都重新生成AI分类建议，确保用户每次都能看到新的分析结果
 * @param {string} text - 任务描述文本
 * @returns {Promise<string|null>} 分类建议，失败时返回null
 */
async function getAIClassification(text) {
    try {
        // 检查AI功能是否启用
        const config = AIConfigManager.getConfig();
        if (!config.enabled || !config.features.autoClassification) {
            return null;
        }
        
        // 直接调用AI服务，不使用缓存
        // 智能分类功能每次都生成新的建议，保证用户体验
        const aiService = new AIService();
        const result = await aiService.classifyTask(text);
        
        console.log('AI分类结果:', result);
        return result;
    } catch (error) {
        console.error('AI分类失败:', error);
        return null;
    }
}

/**
 * 获取AI任务描述优化建议
 * 调用AI服务优化任务描述，每次都生成新的建议
 * @param {string} text - 原始任务描述文本
 * @returns {Promise<string|null>} 优化建议，失败时返回null
 */
async function getAIOptimization(text) {
    try {
        // 检查AI功能是否启用
        const config = AIConfigManager.getConfig();
        if (!config.enabled) {
            return null;
        }
        
        // 直接调用AI服务，不使用缓存
        const aiService = new AIService();
        const result = await aiService.optimizeTaskDescription(text);
        
        console.log('AI优化结果:', result);
        return result;
    } catch (error) {
        console.error('AI优化失败:', error);
        return null;
    }
}

// ================================
// AI分类相关UI函数
// ================================

/**
 * 显示AI分类建议
 * 在用户界面中显示AI推荐的分类标签，用户可以选择接受或忽略
 * @param {string} suggestedTag - AI建议的分类标签
 * @param {string} text - 原始任务文本
 */
function showAISuggestion(suggestedTag, text) {
    const aiSuggestion = document.getElementById('aiSuggestion');
    const aiSuggestionTags = document.getElementById('aiSuggestionTags');
    
    // 清空之前的建议
    aiSuggestionTags.innerHTML = '';
    
    // 创建建议标签按钮
    const tagButton = document.createElement('button');
    tagButton.className = 'ai-suggestion-tag';
    tagButton.textContent = suggestedTag;
    tagButton.addEventListener('click', () => {
        acceptAISuggestion(suggestedTag);
    });
    
    aiSuggestionTags.appendChild(tagButton);
    
    // 显示建议区域
    aiSuggestion.style.display = 'block';
}

/**
 * 接受AI分类建议
 * 用户点击AI建议标签时调用，创建任务并使用AI建议的分类
 * @param {string} suggestedTag - AI建议的分类标签
 */
function acceptAISuggestion(suggestedTag) {
    // 检查是否有待创建的任务数据
    if (!pendingTodoData) {
        console.error('没有待创建的任务数据');
        return;
    }
    
    // 创建todo对象
    const todo = {
        text: pendingTodoData.text,
        completed: false,
        priority: pendingTodoData.priority,
        tag: suggestedTag,
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        aiEnhanced: pendingTodoData.aiEnhanced
    };
    
    // 添加到todos数组
    todos.push(todo);
    
    // 保存到localStorage
    localStorage.setItem('todos', JSON.stringify(todos));
    
    // 清空输入框并重置标签选择
    const todoInput = document.getElementById('todoInput');
    const tagSelect = document.getElementById('tagSelect');
    
    if (todoInput) {
        todoInput.value = '';
    }
    
    if (tagSelect && tagSelect.value === 'ai-classify') {
        // 重置为第一个普通标签
        const firstTag = currentLang === 'zh' ? '工作' : 'Work';
        tagSelect.value = firstTag;
    }
    
    // 清理待创建的任务数据
    pendingTodoData = null;
    
    // 隐藏建议区域
    hideAISuggestion();
    
    // 重新渲染
    renderTodos();
    
    // 显示成功提示
    showToast(currentLang === 'zh' ? '✅ 任务已创建' : '✅ Task created');
}

/**
 * 隐藏AI建议区域
 * 当用户忽略建议或已经接受建议时调用
 */
function hideAISuggestion() {
    const aiSuggestion = document.getElementById('aiSuggestion');
    aiSuggestion.style.display = 'none';
    
    // 如果用户忽略建议，清理待创建的任务数据
    if (pendingTodoData) {
        pendingTodoData = null;
        
        // 显示提示信息
        showToast(currentLang === 'zh' ? '❌ 已忽略AI建议' : '❌ AI suggestion ignored');
    }
}

// ================================
// AI优化相关UI函数
// ================================

/**
 * 显示任务优化弹窗
 * 展示原始描述和AI优化建议，让用户选择是否采用
 * @param {string} originalText - 原始任务描述
 * @param {string} optimizedText - AI优化后的描述
 */
function showOptimizeModal(originalText, optimizedText) {
    const modal = document.getElementById('optimizeModal');
    const originalTextElement = document.getElementById('originalText');
    const optimizedTextElement = document.getElementById('optimizedText');
    const loadingElement = document.getElementById('optimizeLoading');
    const editSection = document.getElementById('editSection');
    
    // 设置原始文本
    originalTextElement.textContent = originalText;
    
    // 如果有优化建议，显示它；否则显示加载状态
    if (optimizedText) {
        optimizedTextElement.textContent = optimizedText;
        optimizedTextElement.style.display = 'block';
        loadingElement.style.display = 'none';
    } else {
        optimizedTextElement.style.display = 'none';
        loadingElement.style.display = 'flex';
    }
    
    // 隐藏编辑区域
    editSection.style.display = 'none';
    
    // 重置按钮状态
    resetOptimizeButtons();
    
    // 显示弹窗
    modal.style.display = 'flex';
}

/**
 * 隐藏任务优化弹窗
 */
function hideOptimizeModal() {
    const modal = document.getElementById('optimizeModal');
    modal.style.display = 'none';
}

/**
 * 重置优化弹窗按钮状态
 */
function resetOptimizeButtons() {
    const acceptBtn = document.getElementById('acceptOptimize');
    const editBtn = document.getElementById('editOptimize');
    const ignoreBtn = document.getElementById('ignoreOptimize');
    const confirmEditBtn = document.getElementById('confirmEdit');
    const cancelEditBtn = document.getElementById('cancelEdit');
    
    // 显示主要按钮
    acceptBtn.style.display = 'inline-block';
    editBtn.style.display = 'inline-block';
    ignoreBtn.style.display = 'inline-block';
    
    // 隐藏编辑按钮
    confirmEditBtn.style.display = 'none';
    cancelEditBtn.style.display = 'none';
}

/**
 * 处理用户采用AI优化建议
 */
function acceptOptimization() {
    const optimizedText = document.getElementById('optimizedText').textContent;
    const todoInput = document.getElementById('todoInput');
    
    // 将优化后的文本设置到输入框
    todoInput.value = optimizedText;
    
    // 隐藏弹窗
    hideOptimizeModal();
    
    // 显示成功提示
    showToast('已采用AI优化建议');
}

/**
 * 进入编辑模式
 */
function enterEditMode() {
    const optimizedText = document.getElementById('optimizedText').textContent;
    const editSection = document.getElementById('editSection');
    const editTextarea = document.getElementById('editTextarea');
    const acceptBtn = document.getElementById('acceptOptimize');
    const editBtn = document.getElementById('editOptimize');
    const ignoreBtn = document.getElementById('ignoreOptimize');
    const confirmEditBtn = document.getElementById('confirmEdit');
    const cancelEditBtn = document.getElementById('cancelEdit');
    
    // 显示编辑区域
    editSection.style.display = 'block';
    editTextarea.value = optimizedText;
    editTextarea.focus();
    
    // 切换按钮状态
    acceptBtn.style.display = 'none';
    editBtn.style.display = 'none';
    ignoreBtn.style.display = 'none';
    confirmEditBtn.style.display = 'inline-block';
    cancelEditBtn.style.display = 'inline-block';
}

/**
 * 确认编辑
 */
function confirmEdit() {
    const editTextarea = document.getElementById('editTextarea');
    const todoInput = document.getElementById('todoInput');
    
    // 将编辑后的文本设置到输入框
    todoInput.value = editTextarea.value.trim();
    
    // 隐藏弹窗
    hideOptimizeModal();
    
    // 显示成功提示
    showToast('已保存编辑内容');
}

/**
 * 取消编辑
 */
function cancelEdit() {
    const editSection = document.getElementById('editSection');
    
    // 隐藏编辑区域
    editSection.style.display = 'none';
    
    // 重置按钮状态
    resetOptimizeButtons();
}

/**
 * 忽略优化建议
 */
function ignoreOptimization() {
    // 直接隐藏弹窗
    hideOptimizeModal();
    
    // 显示提示
    showToast('已忽略AI建议');
}

/**
 * 处理优化按钮点击事件
 * 点击优化按钮时触发，检查输入内容并调用AI优化功能
 */
async function handleOptimizeClick() {
    const todoInput = document.getElementById('todoInput');
    const optimizeBtn = document.getElementById('optimizeBtn');
    const originalText = todoInput.value.trim();
    
    // 检查输入是否为空
    if (!originalText) {
        showToast('请先输入任务描述');
        return;
    }
    
    // 检查AI功能是否启用
    const config = AIConfigManager.getConfig();
    if (!config.enabled) {
        showToast('AI功能未启用，请先配置AI服务');
        return;
    }
    
    // 显示加载状态
    optimizeBtn.disabled = true;
    const iconElement = optimizeBtn.querySelector('.optimize-icon');
    const textElement = optimizeBtn.querySelector('.optimize-text');
    if (iconElement) iconElement.textContent = '⏳';
    if (textElement) textElement.textContent = translations[currentLang].optimize.processing;
    
    try {
        // 先显示弹窗（显示加载状态）
        showOptimizeModal(originalText, null);
        
        // 获取AI优化建议
        const optimizedText = await getAIOptimization(originalText);
        
        if (optimizedText) {
            // 更新弹窗内容
            const optimizedTextElement = document.getElementById('optimizedText');
            const loadingElement = document.getElementById('optimizeLoading');
            
            optimizedTextElement.textContent = optimizedText;
            optimizedTextElement.style.display = 'block';
            loadingElement.style.display = 'none';
        } else {
            // 优化失败
            hideOptimizeModal();
            showToast('AI优化失败，请检查网络连接或API配置');
        }
    } catch (error) {
        console.error('优化过程出错:', error);
        hideOptimizeModal();
        showToast('优化过程出现错误，请稍后再试');
    } finally {
        // 恢复按钮状态
        optimizeBtn.disabled = false;
        const iconElement = optimizeBtn.querySelector('.optimize-icon');
        const textElement = optimizeBtn.querySelector('.optimize-text');
        if (iconElement) iconElement.textContent = '✨';
        if (textElement) textElement.textContent = translations[currentLang].optimize.button;
    }
}

// ================================
// AI配置相关UI函数
// ================================

/**
 * 显示AI配置弹窗
 * 打开AI配置界面，允许用户配置AI提供商、API密钥等设置
 */
function showAIConfigModal() {
    const modal = document.getElementById('aiConfigModal');
    const providerSelect = document.getElementById('aiProvider');
    const modelSelect = document.getElementById('aiModel');
    const baseUrlInput = document.getElementById('aiBaseUrl');
    const apiKeyInput = document.getElementById('aiApiKey');
    const enabledCheckbox = document.getElementById('aiEnabled');
    const rememberCheckbox = document.getElementById('aiRememberChoice');
    
    // 加载当前配置
    const config = AIConfigManager.getConfig();
    const providers = AIConfigManager.getProviderConfigs();
    
    // 填充提供商选项
    providerSelect.innerHTML = '';
    Object.keys(providers).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = providers[key].name;
        providerSelect.appendChild(option);
    });
    
    // 设置当前值
    providerSelect.value = config.apiConfig.provider || 'deepseek';
    baseUrlInput.value = config.apiConfig.baseURL || '';
    apiKeyInput.value = config.apiConfig.apiKey || '';
    enabledCheckbox.checked = config.enabled;
    rememberCheckbox.checked = config.rememberChoice;
    
    // 更新模型选项
    updateModelOptions();
    modelSelect.value = config.apiConfig.model || 'deepseek-chat';
    
    // 监听提供商变化
    providerSelect.addEventListener('change', onProviderChange);
    
    modal.style.display = 'flex';
}

/**
 * 处理AI提供商变化
 * 当用户选择不同的AI提供商时，自动更新API地址和可用模型
 */
function onProviderChange() {
    const providerSelect = document.getElementById('aiProvider');
    const baseUrlInput = document.getElementById('aiBaseUrl');
    const providers = AIConfigManager.getProviderConfigs();
    
    const selectedProvider = providers[providerSelect.value];
    if (selectedProvider) {
        baseUrlInput.value = selectedProvider.baseURL;
        updateModelOptions();
    }
}

/**
 * 更新模型选项下拉框
 * 根据当前选择的AI提供商，更新可用的模型选项
 */
function updateModelOptions() {
    const providerSelect = document.getElementById('aiProvider');
    const modelSelect = document.getElementById('aiModel');
    const providers = AIConfigManager.getProviderConfigs();
    
    const selectedProvider = providers[providerSelect.value];
    if (selectedProvider) {
        modelSelect.innerHTML = '';
        selectedProvider.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
    }
}

/**
 * 隐藏AI配置弹窗
 * 关闭AI配置界面
 */
function hideAIConfigModal() {
    const modal = document.getElementById('aiConfigModal');
    modal.style.display = 'none';
}

/**
 * 保存AI配置
 * 验证用户输入并保存AI配置到localStorage
 */
function saveAIConfig() {
    const providerSelect = document.getElementById('aiProvider');
    const modelSelect = document.getElementById('aiModel');
    const baseUrlInput = document.getElementById('aiBaseUrl');
    const apiKeyInput = document.getElementById('aiApiKey');
    const enabledCheckbox = document.getElementById('aiEnabled');
    const rememberCheckbox = document.getElementById('aiRememberChoice');
    
    const provider = providerSelect.value;
    const model = modelSelect.value;
    const baseURL = baseUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const enabled = enabledCheckbox.checked;
    const rememberChoice = rememberCheckbox.checked;
    
    // 验证必填项
    if (enabled && !apiKey) {
        alert('请输入有效的API密钥');
        return;
    }
    
    // 创建新配置
    const config = {
        enabled,
        rememberChoice,
        features: {
            autoClassification: true
        },
        apiConfig: {
            provider,
            model,
            baseURL,
            apiKey
        }
    };
    
    // 保存配置
    AIConfigManager.saveConfig(config);
    
    // 重新渲染标签选择框以反映AI状态变化
    renderTagSelect();
    
    // 显示成功提示
    const saveBtn = document.getElementById('saveAiConfig');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '✓ 已保存';
    
    setTimeout(() => {
        saveBtn.textContent = originalText;
        hideAIConfigModal();
    }, 1000);
    
    console.log('AI配置已保存:', config);
}

// ================================
// AI事件监听器设置
// ================================

/**
 * 设置AI相关事件监听器
 * 在页面初始化时调用，绑定所有AI功能相关的事件处理
 */
function setupAIEventListeners() {
    // 忽略AI建议按钮
    const dismissButton = document.getElementById('dismissAiSuggestion');
    if (dismissButton) {
        dismissButton.addEventListener('click', hideAISuggestion);
    }
    
    // 监听标签选择变化
    const tagSelect = document.getElementById('tagSelect');
    if (tagSelect) {
        tagSelect.addEventListener('change', (e) => {
            // 如果用户手动选择了其他标签，隐藏AI建议并清理待创建的任务
            if (e.target.value !== 'ai-classify') {
                hideAISuggestion();
            }
        });
    }
    
    // 监听输入框变化，当用户修改输入时隐藏AI建议并清理待创建的任务
    const todoInput = document.getElementById('todoInput');
    if (todoInput) {
        todoInput.addEventListener('input', () => {
            hideAISuggestion();
        });
    }
    
    // AI配置按钮
    const aiConfigToggle = document.getElementById('aiConfigToggle');
    if (aiConfigToggle) {
        aiConfigToggle.addEventListener('click', showAIConfigModal);
    }
    
    // AI配置弹窗相关事件
    const saveAiConfig = document.getElementById('saveAiConfig');
    const closeAiConfig = document.getElementById('closeAiConfig');
    const aiConfigModal = document.getElementById('aiConfigModal');
    
    if (saveAiConfig) {
        saveAiConfig.addEventListener('click', saveAIConfig);
    }
    
    if (closeAiConfig) {
        closeAiConfig.addEventListener('click', hideAIConfigModal);
    }
    
    // 点击弹窗外部关闭
    if (aiConfigModal) {
        aiConfigModal.addEventListener('click', (e) => {
            if (e.target === aiConfigModal) {
                hideAIConfigModal();
            }
        });
    }
    
    // ==============================
    // 任务优化功能事件监听器
    // ==============================
    
    // 优化按钮点击事件
    const optimizeBtn = document.getElementById('optimizeBtn');
    if (optimizeBtn) {
        optimizeBtn.addEventListener('click', handleOptimizeClick);
    }
    
    // 优化弹窗相关事件
    const optimizeModal = document.getElementById('optimizeModal');
    const acceptOptimizeBtn = document.getElementById('acceptOptimize');
    const editOptimizeBtn = document.getElementById('editOptimize');
    const ignoreOptimizeBtn = document.getElementById('ignoreOptimize');
    const confirmEditBtn = document.getElementById('confirmEdit');
    const cancelEditBtn = document.getElementById('cancelEdit');
    
    if (acceptOptimizeBtn) {
        acceptOptimizeBtn.addEventListener('click', acceptOptimization);
    }
    
    if (editOptimizeBtn) {
        editOptimizeBtn.addEventListener('click', enterEditMode);
    }
    
    if (ignoreOptimizeBtn) {
        ignoreOptimizeBtn.addEventListener('click', ignoreOptimization);
    }
    
    if (confirmEditBtn) {
        confirmEditBtn.addEventListener('click', confirmEdit);
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', cancelEdit);
    }
    
    // 点击弹窗外部关闭优化弹窗
    if (optimizeModal) {
        optimizeModal.addEventListener('click', (e) => {
            if (e.target === optimizeModal) {
                hideOptimizeModal();
            }
        });
    }
    
    // ESC键关闭优化弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && optimizeModal && optimizeModal.style.display === 'flex') {
            hideOptimizeModal();
        }
    });
} 