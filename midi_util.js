/**
 * MIDI Utility for Yamaha Reface CP Assistant
 * 处理设备特定的 MIDI 信号和 SysEx 消息。
 */

// 设备编号与名称字典
const MIDI_DEVICES = {
    0: "Reface CP"
};

/**
 * 根据设备编号发送转调 SysEx 信号
 * @param {number} deviceId - 设备编号
 * @param {number} transposeValue - 转调值 (-12 到 +12)
 */
function sendTransposeSysEx(deviceId, transposeValue) {
    if (!window.midiOutput || !window.isRunning) return;

    const val = transposeValue + 64;

    switch (deviceId) {
        case 0: // Reface CP
            // 修正：使用 4 字节地址 04 00 00 07
            const msg = [0xF0, 0x43, 0x10, 0x7F, 0x1C, 0x04, 0x00, 0x00, 0x07, val, 0xF7];
            window.midiOutput.send(msg);
            console.log(`[MIDI] Reface CP Transpose set to: ${transposeValue}`);
            break;
    }
}