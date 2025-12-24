/**
 * Export Module - Handles data export and import functionality
 * Supports JSON, CSV, and Markdown formats
 */

/**
 * Download file from string content
 */
function downloadFile(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export narratives as JSON
 */
function exportAsJSON() {
  try {
    const json = window.storage?.exportNarrativesJSON();
    if (!json) {
      alert('エクスポートに失敗しました');
      return;
    }

    const filename = `narratives_backup_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(json, filename, 'application/json');
  } catch (error) {
    console.error('Export error:', error);
    alert('エクスポート中にエラーが発生しました');
  }
}

/**
 * Export narratives as CSV for Google Sheets
 */
function exportAsCSV() {
  try {
    const csv = window.storage?.exportNarrativesCSV();
    if (!csv) {
      alert('エクスポートに失敗しました');
      return;
    }

    const filename = `narratives_${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
  } catch (error) {
    console.error('Export error:', error);
    alert('エクスポート中にエラーが発生しました');
  }
}

/**
 * Export narratives as Markdown for Notion
 */
function exportAsMarkdown() {
  try {
    const narratives = window.storage?.getAllNarratives() || [];
    if (narratives.length === 0) {
      alert('エクスポートするナラティブがありません');
      return;
    }

    let md = '# English Narrative Archive\n\n';
    md += `Generated: ${new Date().toLocaleString('ja-JP')}\n\n`;
    md += `Total Narratives: ${narratives.length}\n\n`;
    md += '---\n\n';

    narratives.forEach((n, idx) => {
      md += `## ${idx + 1}. ${n.category?.toUpperCase() || 'CUSTOM'} - ${n.created_at?.split('T')[0]}\n\n`;
      md += `**Status:** ${n.srs?.status} | **Reviews:** ${n.srs?.review_count || 0}\n\n`;

      md += `### Narrative\n\n`;
      md += `> ${n.narrative_en}\n\n`;

      if (n.key_phrases && n.key_phrases.length > 0) {
        md += `### Key Phrases\n\n`;
        n.key_phrases.forEach(p => {
          md += `- **${p.phrase_en}** - ${p.meaning_ja}\n`;
          md += `  - ${p.usage_hint_ja}\n`;
        });
        md += '\n';
      }

      if (n.recall_test) {
        md += `### Recall Test\n\n`;
        md += `**Question:** ${n.recall_test.prompt_ja}\n\n`;
        if (n.recall_test.expected_points_en && n.recall_test.expected_points_en.length > 0) {
          md += `**Expected Points:**\n`;
          n.recall_test.expected_points_en.forEach(p => {
            md += `- ${p}\n`;
          });
        }
        md += '\n';
      }

      if (n.srs) {
        md += `### Review Info\n\n`;
        md += `- **Next Review:** ${n.srs.next_review_date}\n`;
        md += `- **Last Reviewed:** ${n.srs.last_reviewed ? new Date(n.srs.last_reviewed).toLocaleDateString('ja-JP') : 'Never'}\n`;
        md += `- **Interval:** ${window.srs?.getIntervalName(n.srs.interval_index) || 'Unknown'}\n`;
        md += '\n';
      }

      md += '---\n\n';
    });

    const filename = `narratives_${new Date().toISOString().split('T')[0]}.md`;
    downloadFile(md, filename, 'text/markdown;charset=utf-8;');
  } catch (error) {
    console.error('Export error:', error);
    alert('エクスポート中にエラーが発生しました');
  }
}

/**
 * Import narratives from JSON file
 */
function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonString = e.target.result;
        const imported = window.storage?.importNarrativesJSON(jsonString);

        if (imported && imported.length > 0) {
          resolve({
            success: true,
            count: imported.length,
            message: `${imported.length}件のナラティブをインポートしました`
          });
        } else {
          reject(new Error('インポートできるナラティブが見つかりません'));
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };

    reader.readAsText(file);
  });
}

/**
 * Render export options UI
 */
function renderExportUI() {
  const container = document.getElementById('result-container');
  if (!container) return;

  const narratives = window.storage?.getAllNarratives() || [];
  const stats = window.storage?.getStorageStats();

  let html = `
    <h2>📤 データをエクスポート</h2>

    <div style="background: #0f172a; padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem;">
      <p style="margin: 0 0 0.5rem 0; color: var(--text-secondary);">保存されているナラティブ数</p>
      <p style="font-size: 2rem; margin: 0; color: var(--accent-color);">${narratives.length}</p>
      <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: var(--text-tertiary);">
        保存容量: ${stats?.total_storage_kb} KB
      </p>
    </div>

    <h3>形式を選択してください</h3>

    <div style="display: grid; gap: 1rem; margin-bottom: 2rem;">
      <button class="secondary" onclick="window.exportAsJSON()" style="padding: 1.5rem; text-align: left; border-radius: 0.75rem;">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">📋 JSON</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">
          バックアップと復元用。すべての情報を含みます
        </div>
      </button>

      <button class="secondary" onclick="window.exportAsCSV()" style="padding: 1.5rem; text-align: left; border-radius: 0.75rem;">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">📊 CSV</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">
          Google Sheets / Excel 用。スプレッドシートにインポートできます
        </div>
      </button>

      <button class="secondary" onclick="window.exportAsMarkdown()" style="padding: 1.5rem; text-align: left; border-radius: 0.75rem;">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">📝 Markdown</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">
          Notion 用。フォーマット済みのドキュメント
        </div>
      </button>
    </div>

    <h3>バックアップからインポート</h3>

    <div style="border: 2px dashed var(--border-color); padding: 2rem; border-radius: 1rem; text-align: center; margin-bottom: 2rem;"
         ondrop="window.handleImportDrop(event)" ondragover="event.preventDefault()" ondragleave="event.preventDefault()">
      <div style="font-size: 2rem; margin-bottom: 1rem;">📂</div>
      <p style="margin: 0 0 1rem 0; color: var(--text-secondary);">
        JSON ファイルをドラッグ＆ドロップするか、
      </p>
      <input type="file" id="import-file" accept=".json" onchange="window.handleImportFile(event)" style="display: none;">
      <button class="secondary" onclick="document.getElementById('import-file').click()">
        ファイルを選択
      </button>
    </div>

    <button class="secondary" onclick="window.goToHistory()">← 戻る</button>
  `;

  container.innerHTML = html;
}

// Global handlers
window.exportAsJSON = exportAsJSON;
window.exportAsCSV = exportAsCSV;
window.exportAsMarkdown = exportAsMarkdown;
window.renderExportUI = renderExportUI;

window.handleImportFile = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  importFromJSON(file)
    .then(result => {
      alert(result.message);
      window.goToHistory();
    })
    .catch(error => {
      alert('インポート失敗: ' + error.message);
    });
};

window.handleImportDrop = function(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (!file) return;

  importFromJSON(file)
    .then(result => {
      alert(result.message);
      window.goToHistory();
    })
    .catch(error => {
      alert('インポート失敗: ' + error.message);
    });
};
