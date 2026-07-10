/**
 * 自动踏板引擎 (Auto-Sustain Engine)
 */


window.isBreakingSustain = false;//自动踏板状态锁：标识当前是否处于“等待换气”状态
let pedalReleaseStartTime = 0; // 【新增】记录踏板松开的瞬间，用于计算止音时长
/**
 * 自动踏板引擎 (Auto-Sustain Engine - Adaptive Version)
 * @param {string} phase - 当前阶段："check_collision" 或 "try_repress"
 * @param {number} newNote - 当前新弹奏的音符 (仅在 check_collision 阶段有效)
 */
function sustainer(phase,newNote = null) {
    if (!window.autoSustainEnabled) return;

    // --- 阶段 1：低音冲突检测 ---
    if (phase === "check_collision") {
        // 【核心优化】：如果这个音已经在低音池里了，说明它已经是当前和声的一部分，不需要触发换气检测
        if (window.lowNotes.has(newNote)) return;

        let hasCollision = false;

        // 算法 A：更低音判定 (New Bottom Note Detection)
        // 如果池子里已经有低音了，且新弹的音比它们都低，则视为开启新和弦，强制换气
        if (window.lowNotes.size > 0) {
            const minExistingNote = Math.min(...window.lowNotes);
            if (newNote < minExistingNote) {
                hasCollision = true;
                console.log("[Auto-Sustain] 探测到更低的基准音，立即换气...");
            }
        }

        // 算法 B：音程冲突检测 (仅在算法 A 未触发时进行)
        if (!hasCollision) {
            // 注意：此时 newNote 还没被加入 window.lowNotes，所以我们要把它也算进去
            const notesArr = Array.from(window.lowNotes);
            notesArr.push(newNote);
            notesArr.sort((a, b) => a - b);

            for (let i = 0; i < notesArr.length - 1; i++) {
                if (notesArr[i + 1] - notesArr[i] < 3) { // 小于大三度
                    hasCollision = true;
                    console.log("[Auto-Sustain] 探测到音程冲突，执行换气...");
                    break;
                }
            }
        }

        if (hasCollision) {
            // 物理换气动作
            if (typeof sendSustainOff === 'function') {
                sendSustainOff(window.currentDeviceID);
            }
            pedalReleaseStartTime = performance.now();
            window.isBreakingSustain = true;
            window.isPedalDown = false;

            // 既然要换气了，清理掉旧的低音，仅保留当前手指还按着的（包括这个 newNote）
//            window.lowNotes.forEach(note => {
//                if (!window.activeNotes.has(note)) window.lowNotes.delete(note);
//            });
            window.lowNotes.clear();
            window.lowNotes.add(newNote);

            window.pedalHeldNotes.clear();
            if (typeof updateCombinedNotes === 'function') updateCombinedNotes();
            if (typeof refreshKeyboardUI === 'function') refreshKeyboardUI();
        }
    }

    // --- 阶段 2：自适应重新踩下 (任意 Note Off 时调用) ---
    else if (phase === "try_repress") {
        // 只有当处于“换气期”时，才在用户松开手指的瞬间重踩踏板
        if (window.isBreakingSustain) {
            console.log("[Auto-Sustain] 检测到手指松开，此时物理琴弦已停止震动，重新踩下踏板...");

            const dampingDuration = performance.now() - pedalReleaseStartTime;
            console.log(`%c[Pedal Timer] Damping Duration: ${dampingDuration.toFixed(2)}ms`, "color: #ff9800; font-weight: bold;");


            if (typeof sendSustainOn === 'function') {
                sendSustainOn(window.currentDeviceID);
            }

            // 解除状态锁
            window.isBreakingSustain = false;

            window.isPedalDown = true;

            // 重新同步：把手指还按着的音锁进延音缓存
            window.activeNotes.forEach(note => {
                window.pedalHeldNotes.add(note);
            });

            if (typeof updateCombinedNotes === 'function') updateCombinedNotes();
            if (typeof refreshKeyboardUI === 'function') refreshKeyboardUI();
        }
    }
}


/**
 * 【仅用作测试】瞬间切踏板 (Break & Re-sustain)
 */
function break_sustain() {
    if (!window.autoSustainEnabled) return;

    // 1. 1ms 以后松开踏板 (物理释放缓冲)
    setTimeout(() => {
        if (typeof sendSustainOff === 'function') {
            sendSustainOff(window.currentDeviceID);
        }

        // 2. UI层清除已释放的延音，但保留手指正按着的 (activeNotes)
        window.pedalHeldNotes.clear();

        if (typeof updateCombinedNotes === 'function') updateCombinedNotes();
        if (typeof refreshKeyboardUI === 'function') refreshKeyboardUI();
    }, 1);

    // 2. 50ms 以后再踩下踏板 (确保硬件彻底释放旧采样)
    setTimeout(() => {
        if (window.autoSustainEnabled) {
            if (typeof sendSustainOn === 'function') {
                sendSustainOn(window.currentDeviceID);
            }
            // 重新同步：把手指还按着的音锁进延音缓存
            window.activeNotes.forEach(note => {
                window.pedalHeldNotes.add(note);
            });
            if (typeof updateCombinedNotes === 'function') updateCombinedNotes();
            if (typeof refreshKeyboardUI === 'function') refreshKeyboardUI();
        }
    }, 300);
}