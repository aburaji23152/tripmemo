// データの読み込みと初期化（localStorageから取得）
const tableBody = document.getElementById('tableBody');
let records = JSON.parse(localStorage.getItem('trainRecords')) || [];

// 編集中の行のインデックス（-1は編集モードなし）
let editingIndex = -1;

// 各日付の折りたたみ状態を記録するオブジェクト
let collapsedDates = {};

// 今日のおおよその日付（ローカルタイム）をフォームの初期値にする
function setTodayDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;
}

// データを【開閉状態】＞【日付順】＞【時刻順】にソートする関数
function sortRecords() {
    records.sort((a, b) => {
        const aCollapsed = collapsedDates[a.date] || false;
        const bCollapsed = collapsedDates[b.date] || false;

        if (aCollapsed !== bCollapsed) {
            return aCollapsed ? 1 : -1;
        }
        if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
        }
        return a.time.localeCompare(b.time);
    });
}

// テーブルの描画処理
function renderTable() {
    tableBody.innerHTML = '';
    if (records.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#7f8c8d;">記録がありません</td></tr>`;
        return;
    }

    if (editingIndex === -1) {
        sortRecords();
    }

    let currentScaleDate = '';

    records.forEach((record, index) => {
        // 日付の見出し行
        if (record.date !== currentScaleDate) {
            currentScaleDate = record.date;
            
            const dateObj = new Date(record.date);
            const formattedDate = isNaN(dateObj.getTime()) ? record.date : `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

            const isCollapsed = collapsedDates[record.date] || false;
            const toggleIcon = isCollapsed ? '▶' : '▼';

            // 日付見出し行（削除ボタンのスタイルを行の削除ボタンと統一）
            const dateRow = document.createElement('tr');
            dateRow.className = 'date-header-row';
            dateRow.setAttribute('data-date', record.date);
            dateRow.innerHTML = `
                <td colspan="8" style="background-color: ${isCollapsed ? '#f2f4f4' : '#ecf0f1'}; color: ${isCollapsed ? '#7f8c8d' : '#2c3e50'}; font-weight: bold; text-align: left; padding: 10px 12px; font-size: 0.95rem; cursor: pointer; position: relative;">
                    <span style="display: inline-block; padding: 4px 0;">${toggleIcon} 🗓️ ${formattedDate} ${isCollapsed ? '<span style="font-weight:normal; font-size:11px; margin-left:10px;">(隠して下へ移動中)</span>' : ''}</span>
                    <button class="delete-date-btn" data-date="${record.date}" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background-color: #e74c3c; color: white; border: none; padding: 4px 8px; font-size: 12px; border-radius: 4px; cursor: pointer; font-weight: normal; width: auto; margin: 0;">
                        🗑️ この日を削除
                    </button>
                </td>
            `;
            tableBody.appendChild(dateRow);
        }

        const tr = document.createElement('tr');
        
        if (collapsedDates[record.date]) {
            tr.classList.add('hidden-row');
        }

        // --- 遅延データの数値判定とスタイル定義 ---
        const depDelayVal = parseInt(record.depDelay) || 0;
        const arrDelayVal = parseInt(record.arrDelay) || 0;

        // 通常表示用のスタイル（1以上なら赤文字）
        const depDelayStyle = depDelayVal >= 1 ? 'color: #e74c3c; font-weight: bold;' : '';
        const arrDelayStyle = arrDelayVal >= 1 ? 'color: #e74c3c; font-weight: bold;' : '';

        // 編集モード（input）用のスタイル（1以上なら薄い赤背景）
        const depInputStyle = depDelayVal >= 1 ? 'background-color: #fdf2f2; color: #e74c3c; font-weight: bold;' : '';
        const arrInputStyle = arrDelayVal >= 1 ? 'background-color: #fdf2f2; color: #e74c3c; font-weight: bold;' : '';
        // ----------------------------------------

        if (editingIndex === index) {
            tr.innerHTML = `
                <td><input type="text" id="edit_depStation" value="${escapeHTML(record.depStation)}"></td>
                <td><input type="time" id="edit_time" value="${escapeHTML(record.time)}"></td>
                <td><input type="text" id="edit_arrStation" value="${escapeHTML(record.arrStation)}"></td>
                <td><input type="number" id="edit_depDelay" value="${depDelayVal}" min="0" style="width:50px; ${depInputStyle}"></td>
                <td><input type="number" id="edit_arrDelay" value="${arrDelayVal}" min="0" style="width:50px; ${arrInputStyle}"></td>
                <td><input type="text" id="edit_trainNum" value="${escapeHTML(record.trainNum)}" style="width:70px;"></td>
                <td><input type="text" id="edit_memo" value="${escapeHTML(record.memo)}"></td>
                <td>
                    <button class="save-btn" data-index="${index}" style="background-color:#2ecc71; padding:4px 8px; font-size:12px; width:auto; margin:2px;">保存</button>
                    <button class="cancel-btn" style="background-color:#95a5a6; padding:4px 8px; font-size:12px; width:auto; margin:2px;">中止</button>
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td>${escapeHTML(record.depStation)}</td>
                <td>${escapeHTML(record.time)}</td>
                <td>${escapeHTML(record.arrStation)}</td>
                <td style="${depDelayStyle}">${depDelayVal}</td>
                <td style="${arrDelayStyle}">${arrDelayVal}</td>
                <td>${escapeHTML(record.trainNum)}</td>
                <td>${escapeHTML(record.memo)}</td>
                <td>
                    <button class="edit-btn" data-index="${index}" style="background-color:#f39c12; padding:4px 8px; font-size:12px; width:auto; margin:2px;">編集</button>
                    <button class="delete-btn" data-index="${index}" style="background-color:#e74c3c; padding:4px 8px; font-size:12px; width:auto; margin:2px;">削除</button>
                </td>
            `;
        }
        tableBody.appendChild(tr);
    });

    bindActionButtons();
}

// 各種ボタンのイベント登録
function bindActionButtons() {
    document.querySelectorAll('.date-header-row').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-date-btn')) return;
            
            const targetDate = header.getAttribute('data-date');
            collapsedDates[targetDate] = !collapsedDates[targetDate];
            renderTable();
        });
    });

    document.querySelectorAll('.delete-date-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetDate = button.getAttribute('data-date');
            deleteDateRecords(targetDate);
        });
    });

    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            editingIndex = parseInt(button.getAttribute('data-index'));
            renderTable();
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(button.getAttribute('data-index'));
            deleteRecord(index);
        });
    });

    document.querySelectorAll('.cancel-btn').forEach(button => {
        button.addEventListener('click', () => {
            editingIndex = -1;
            renderTable();
        });
    });

    document.querySelectorAll('.save-btn').forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'));
            saveEdit(index);
        });
    });
}

function deleteDateRecords(targetDate) {
    const dateObj = new Date(targetDate);
    const formattedDate = isNaN(dateObj.getTime()) ? targetDate : `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

    if (confirm(`⚠️ 警告 ⚠️\n\n${formattedDate} の記録を「すべて」削除しますか？\nこの操作は元に戻せません。`)) {
        records = records.filter(record => record.date !== targetDate);
        localStorage.setItem('trainRecords', JSON.stringify(records));
        
        if (collapsedDates[targetDate] !== undefined) {
            delete collapsedDates[targetDate];
        }
        
        renderTable();
        alert(`${formattedDate} の記録を一括削除しました。`);
    }
}

function saveEdit(index) {
    const depStation = document.getElementById('edit_depStation').value;
    const time = document.getElementById('edit_time').value;
    const arrStation = document.getElementById('edit_arrStation').value;
    const depDelay = document.getElementById('edit_depDelay').value;
    const arrDelay = document.getElementById('edit_arrDelay').value;
    const trainNum = document.getElementById('edit_trainNum').value;
    const memo = document.getElementById('edit_memo').value;

    if (!depStation || !time || !arrStation) {
        alert('乗車駅、時刻、下車駅は必須入力です。');
        return;
    }

    records[index] = {
        ...records[index],
        depStation, time, arrStation, depDelay, arrDelay, trainNum, memo
    };

    localStorage.setItem('trainRecords', JSON.stringify(records));
    editingIndex = -1;
    renderTable();
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}

document.getElementById('addBtn').addEventListener('click', () => {
    const date = document.getElementById('date').value;
    const depStation = document.getElementById('depStation').value;
    const time = document.getElementById('time').value;
    const arrStation = document.getElementById('arrStation').value;
    const depDelay = document.getElementById('depDelay').value;
    const arrDelay = document.getElementById('arrDelay').value;
    const trainNum = document.getElementById('trainNum').value;
    const memo = document.getElementById('memo').value;

    if (!date || !depStation || !time || !arrStation) {
        alert('日付、乗車駅、時刻、下車駅は必須入力です。');
        return;
    }

    const newRecord = { date, depStation, time, arrStation, depDelay, arrDelay, trainNum, memo };
    records.push(newRecord);
    localStorage.setItem('trainRecords', JSON.stringify(records));
    
    renderTable();
    clearForm();
});

function deleteRecord(index) {
    if (confirm('この記録を削除しますか？')) {
        records.splice(index, 1);
        localStorage.setItem('trainRecords', JSON.stringify(records));
        renderTable();
    }
}

function downloadCSV(targetRecords, fileNameKeyword) {
    let csvContent = '日付,乗車駅,時刻,下車駅,遅延(発),遅延(着),編成番号,メモ\r\n';

    targetRecords.forEach(record => {
        const row = [
            `"${record.date}"`,
            `"${record.depStation.replace(/"/g, '""')}"`,
            `"${record.time}"`,
            `"${record.arrStation.replace(/"/g, '""')}"`,
            `"${record.depDelay || 0}"`,
            `"${record.arrDelay || 0}"`,
            `"${(record.trainNum || '').replace(/"/g, '""')}"`,
            `"${(record.memo || '').replace(/"/g, '""')}"`
        ].join(',');
        csvContent += row + '\r\n';
    });

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `train_records_${fileNameKeyword}.csv`);
    link.click();
}

document.getElementById('downloadBtn').addEventListener('click', () => {
    if (records.length === 0) return alert('ダウンロードする記録がありません。');
    sortRecords();
    const now = new Date();
    const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    downloadCSV(records, `all_${dateStr}`);
});

document.getElementById('downloadDateBtn').addEventListener('click', () => {
    const selectedDate = document.getElementById('date').value;
    if (!selectedDate) return alert('日付を選択してください。');

    const filteredRecords = records.filter(record => record.date === selectedDate);
    if (filteredRecords.length === 0) return alert(`${selectedDate} の記録はありません。`);

    filteredRecords.sort((a, b) => a.time.localeCompare(b.time));
    downloadCSV(filteredRecords, selectedDate.replace(/-/g, ''));
});

document.getElementById('uploadFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const lines = event.target.result.split(/\r\n|\n/);
        let importCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const row = parseCSVLine(line);
            if (row.length < 4) continue;

            const date = row[0];
            const depStation = row[1];
            const time = row[2];
            const arrStation = row[3];

            if (date && depStation && time && arrStation) {
                records.push({
                    date, depStation, time, arrStation,
                    depDelay: row[4] || "0", arrDelay: row[5] || "0",
                    trainNum: row[6] || "", memo: row[7] || ""
                });
                importCount++;
            }
        }

        if (importCount > 0) {
            localStorage.setItem('trainRecords', JSON.stringify(records));
            renderTable();
            alert(`${importCount}件の記録をインポートしました！`);
        }
        document.getElementById('uploadFile').value = '';
    };
    reader.readAsText(file);
});

function parseCSVLine(line) {
    const result = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
        else { current += char; }
    }
    result.push(current); return result;
}

function clearForm() {
    setTodayDate();
    document.getElementById('depStation').value = '';
    document.getElementById('time').value = '';
    document.getElementById('arrStation').value = '';
    document.getElementById('depDelay').value = '0';
    document.getElementById('arrDelay').value = '0';
    document.getElementById('trainNum').value = '';
    document.getElementById('memo').value = '';
}

setTodayDate();
renderTable();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 1. クエリパラメータ（?v=...）を削除し、純粋な 'sw.js' で登録する
        // ※これが無限ループの最大の原因になるため修正します
        navigator.serviceWorker.register('sw.js').then(reg => {
            
            // 定期的に新しいService Workerがないかチェック（1時間ごとなど、必要に応じて）
            // reg.update(); 

            // 待機中の新しいService Workerがあるか監視
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker == null) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // すでにセッション内で確認ダイアログを出したかチェック（二重ポップアップ防止）
                            if (!sessionStorage.getItem('pwa_update_prompted')) {
                                sessionStorage.setItem('pwa_update_prompted', 'true');
                                
                                if (confirm('新しいバージョンが利用可能です。アップデートして最新の状態にしますか？')) {
                                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                                } else {
                                    // 「キャンセル」された場合はセッションが切れるまで再度聞かない
                                    sessionStorage.removeItem('pwa_update_prompted');
                                }
                            }
                        }
                    }
                });
            });
            
        }).catch(err => {
            console.error('Service Workerの登録に失敗しました:', err);
        });
    });

    // 2. リロードの二重実行を徹底的に防ぐフラグ管理
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        
        // アップデートフラグをクリアしてからリロード
        sessionStorage.removeItem('pwa_update_prompted');
        window.location.reload();
    });
}
