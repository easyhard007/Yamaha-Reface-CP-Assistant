/**
 * 自动踏板引擎 (Auto-Sustain Engine)
 */
function sustainer() {
    // 检查全局开关状态

    if (window.autoSustainEnabled) {
        // 如果开启了自动踏板，立即发送踩下信号
        if (typeof sendSustainOn === 'function') {
            sendSustainOn(window.currentDeviceID);
        }
        if (!window.isPedalDown) {
            window.isPedalDown = true;
        }
    } else {
        // 如果关闭了自动踏板，立即发送松开信号以确保不会长鸣
        if (typeof sendSustainOff === 'function') {
            sendSustainOff(window.currentDeviceID);
        }
        if (window.isPedalDown) {
            window.isPedalDown = false;
            window.pedalHeldNotes.clear();
            if (typeof refreshKeyboardUI === 'function') {
                    refreshKeyboardUI();
            }
        }
    }
}

/**
 * 瞬间切踏板 (Break & Re-sustain)
 * 用于在和弦改变时清除之前的延音，防止声音混浊
 */
function break_sustain() {
    if (!window.autoSustainEnabled) return;

    // 1. 立即松开硬件踏板
    if (typeof sendSustainOff === 'function') {
        sendSustainOff(window.currentDeviceID);
    }

    // 2. 清除内部延音缓存并刷新 UI
    if (window.pedalHeldNotes) {
        window.pedalHeldNotes.clear();
    }
    if (typeof updateCombinedNotes === 'function') updateCombinedNotes();
    if (typeof refreshKeyboardUI === 'function') refreshKeyboardUI();

    // 3. 10ms 后重新踩下踏板，锁住当前正在按下的音
    setTimeout(() => {
        if (window.autoSustainEnabled && typeof sendSustainOn === 'function') {
            sendSustainOn(window.currentDeviceID);
            // 将当前物理按下的音符重新补入踏板缓存
            window.activeNotes.forEach(note => {
                window.pedalHeldNotes.add(note);
            });
            if (typeof updateCombinedNotes === 'function') updateCombinedNotes();
            if (typeof refreshKeyboardUI === 'function') refreshKeyboardUI();
        }
    }, 10);
}