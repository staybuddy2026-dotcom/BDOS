const fs = require('fs');
const path = require('path');

const pagePath = path.resolve('d:/workspace/Projects/LeadGenerationToolForBBDE/LeadGenerationToolForBBDE/src/app/settings/page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Add State Variables
content = content.replace(
  `  // Apollo Settings State\n  const [apolloEnabled, setApolloEnabled] = useState('true');`,
  `  // Other Providers State
  const [linkedinEnabled, setLinkedinEnabled] = useState('false');
  const [linkedinApiKey, setLinkedinApiKey] = useState('');
  const [crunchbaseEnabled, setCrunchbaseEnabled] = useState('false');
  const [crunchbaseApiKey, setCrunchbaseApiKey] = useState('');
  const [githubEnabled, setGithubEnabled] = useState('false');
  const [githubApiKey, setGithubApiKey] = useState('');

  // AI & Outreach State
  const [immediateActionThreshold, setImmediateActionThreshold] = useState('90');
  const [defaultSignature, setDefaultSignature] = useState('Akash | BD Owner | Tiny Script Soft Tech Pvt. Ltd. (akash@tinyscript.com)');

  // Apollo Settings State
  const [apolloEnabled, setApolloEnabled] = useState('true');`
);

// 2. loadConfigData
content = content.replace(
  `setApolloApiKey(data.apolloApiKey || 'ap_live_98a7f432194b2');`,
  `setApolloApiKey(data.apolloApiKey || 'ap_live_98a7f432194b2');
      
      setLinkedinEnabled(String(data.linkedinEnabled ?? 'false'));
      setLinkedinApiKey(data.linkedinApiKey || '');
      setCrunchbaseEnabled(String(data.crunchbaseEnabled ?? 'false'));
      setCrunchbaseApiKey(data.crunchbaseApiKey || '');
      setGithubEnabled(String(data.githubEnabled ?? 'false'));
      setGithubApiKey(data.githubApiKey || '');
      setImmediateActionThreshold(String(data.immediateActionThreshold ?? '90'));
      setDefaultSignature(data.defaultSignature || 'Akash | BD Owner | Tiny Script Soft Tech Pvt. Ltd. (akash@tinyscript.com)');`
);

// 3. handleSaveConfig
content = content.replace(
  `        apolloCreditWarningThreshold,
        apolloApiKey
      });`,
  `        apolloCreditWarningThreshold,
        apolloApiKey,
        linkedinEnabled,
        linkedinApiKey,
        crunchbaseEnabled,
        crunchbaseApiKey,
        githubEnabled,
        githubApiKey,
        immediateActionThreshold,
        defaultSignature
      });`
);

// 4. handleSaveSecretKey
content = content.replace(
  `    if (keyModalConnector.id !== 'apollo') {
      triggerNotification('error', \`\${keyModalConnector.name} is coming soon and does not accept credentials yet.\`);
      setKeyModalConnector(null);
      setSecretKeyInput('');
      return;
    }`,
  ``
);

content = content.replace(
  `    try {
      setApolloApiKey(secretKeyInput);
      await updateAppSettings({
        primaryTone, secondaryTone, tertiaryTone, activeModel, weeklyLimit,
        apolloEnabled, apolloConfirmRequired, apolloMaxEnrich, apolloAllowPersonalEmail,
        apolloAllowPhone, apolloCreditWarningThreshold, apolloApiKey: secretKeyInput
      });`,
  `    try {
      if (keyModalConnector.id === 'apollo') setApolloApiKey(secretKeyInput);
      else if (keyModalConnector.id === 'linkedin') setLinkedinApiKey(secretKeyInput);
      else if (keyModalConnector.id === 'crunchbase') setCrunchbaseApiKey(secretKeyInput);
      else if (keyModalConnector.id === 'github') setGithubApiKey(secretKeyInput);

      await updateAppSettings({
        primaryTone, secondaryTone, tertiaryTone, activeModel, weeklyLimit,
        apolloEnabled, apolloConfirmRequired, apolloMaxEnrich, apolloAllowPersonalEmail,
        apolloAllowPhone, apolloCreditWarningThreshold,
        apolloApiKey: keyModalConnector.id === 'apollo' ? secretKeyInput : apolloApiKey,
        linkedinEnabled, linkedinApiKey: keyModalConnector.id === 'linkedin' ? secretKeyInput : linkedinApiKey,
        crunchbaseEnabled, crunchbaseApiKey: keyModalConnector.id === 'crunchbase' ? secretKeyInput : crunchbaseApiKey,
        githubEnabled, githubApiKey: keyModalConnector.id === 'github' ? secretKeyInput : githubApiKey,
        immediateActionThreshold, defaultSignature
      });`
);

// 5. Connectors Test/Config keys mapping
content = content.replace(
  `                        onClick={() => {
                          setKeyModalConnector({ id: c.id, name: c.name });
                          setSecretKeyInput(c.id === 'apollo' ? apolloApiKey : '');
                        }}
                        disabled={c.id !== 'apollo'}
                        title={c.id !== 'apollo' ? \`\${c.name} is coming soon\` : undefined}
                        style={{ padding: '6px 12px', fontSize: '0.82rem', background: c.id !== 'apollo' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(37, 99, 235, 0.1)', color: c.id !== 'apollo' ? '#94a3b8' : '#2563eb', border: c.id !== 'apollo' ? '1px solid rgba(100, 116, 139, 0.15)' : '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '6px', cursor: c.id !== 'apollo' ? 'not-allowed' : 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}`,
  `                        onClick={() => {
                          setKeyModalConnector({ id: c.id, name: c.name });
                          if (c.id === 'apollo') setSecretKeyInput(apolloApiKey);
                          else if (c.id === 'linkedin') setSecretKeyInput(linkedinApiKey);
                          else if (c.id === 'crunchbase') setSecretKeyInput(crunchbaseApiKey);
                          else if (c.id === 'github') setSecretKeyInput(githubApiKey);
                          else setSecretKeyInput('');
                        }}
                        style={{ padding: '6px 12px', fontSize: '0.82rem', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '6px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}`
);

// 6. Tabs replacements (General, Prioritization, Outreach, Linkedin, Github, Crunchbase)
content = content.replace(
  \`{/* TAB: LINKEDIN SETTINGS */}
          {activeTab === 'linkedin' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Share2 size={18} style={{ color: '#3b82f6' }} /> LinkedIn Social Intelligence Configuration
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  <strong>Coming Soon.</strong> LinkedIn is not yet a live integration in this release — no credentials are configured and no data is fetched from LinkedIn. Use <strong>Apollo.io</strong> for live prospecting today.
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Status: <strong style={{ color: '#d97706' }}>Coming Soon</strong></span>
              </div>
            </div>
          )}\`,
  \`{/* TAB: LINKEDIN SETTINGS */}
          {activeTab === 'linkedin' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Share2 size={18} style={{ color: '#3b82f6' }} /> LinkedIn Social Intelligence Configuration
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>LinkedIn API Key</label>
                  <input
                    type="password"
                    value={linkedinApiKey}
                    onChange={(e) => setLinkedinApiKey(e.target.value)}
                    placeholder="Enter LinkedIn API Key"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem', fontFamily: 'monospace', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Integration Status</label>
                  <CustomDropdown
                    value={linkedinEnabled}
                    onChange={(value) => setLinkedinEnabled(value)}
                    options={[
                      { value: 'true', label: 'Enabled' },
                      { value: 'false', label: 'Disabled' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <button
                  onClick={() => handleSaveConfig()}
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}
                >
                  <Save size={14} /> Save Configuration
                </button>
              </div>
            </div>
          )}\`
);

content = content.replace(
  \`{/* TAB: CRUNCHBASE SETTINGS */}
          {activeTab === 'crunchbase' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: '#3b82f6' }} /> Crunchbase Growth Intelligence Configuration
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  <strong>Coming Soon.</strong> Crunchbase is not yet a live integration in this release — no credentials are configured and no data is fetched from Crunchbase. Use <strong>Apollo.io</strong> for live prospecting today.
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Status: <strong style={{ color: '#d97706' }}>Coming Soon</strong></span>
              </div>
            </div>
          )}\`,
  \`{/* TAB: CRUNCHBASE SETTINGS */}
          {activeTab === 'crunchbase' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: '#3b82f6' }} /> Crunchbase Growth Intelligence Configuration
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Crunchbase API Key</label>
                  <input
                    type="password"
                    value={crunchbaseApiKey}
                    onChange={(e) => setCrunchbaseApiKey(e.target.value)}
                    placeholder="Enter Crunchbase API Key"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem', fontFamily: 'monospace', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Integration Status</label>
                  <CustomDropdown
                    value={crunchbaseEnabled}
                    onChange={(value) => setCrunchbaseEnabled(value)}
                    options={[
                      { value: 'true', label: 'Enabled' },
                      { value: 'false', label: 'Disabled' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <button
                  onClick={() => handleSaveConfig()}
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}
                >
                  <Save size={14} /> Save Configuration
                </button>
              </div>
            </div>
          )}\`
);

content = content.replace(
  \`{/* TAB: GITHUB SETTINGS */}
          {activeTab === 'github' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: '#3b82f6' }} /> GitHub Engineering Intelligence Provider Configuration
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  <strong>Coming Soon.</strong> GitHub is not yet a live integration in this release — no credentials are configured and no data is fetched from GitHub. Use <strong>Apollo.io</strong> for live prospecting today.
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Status: <strong style={{ color: '#d97706' }}>Coming Soon</strong></span>
              </div>
            </div>
          )}\`,
  \`{/* TAB: GITHUB SETTINGS */}
          {activeTab === 'github' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: '#3b82f6' }} /> GitHub Engineering Intelligence Provider Configuration
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>GitHub API Key</label>
                  <input
                    type="password"
                    value={githubApiKey}
                    onChange={(e) => setGithubApiKey(e.target.value)}
                    placeholder="Enter GitHub API Key"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem', fontFamily: 'monospace', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Integration Status</label>
                  <CustomDropdown
                    value={githubEnabled}
                    onChange={(value) => setGithubEnabled(value)}
                    options={[
                      { value: 'true', label: 'Enabled' },
                      { value: 'false', label: 'Disabled' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <button
                  onClick={() => handleSaveConfig()}
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}
                >
                  <Save size={14} /> Save Configuration
                </button>
              </div>
            </div>
          )}\`
);

content = content.replace(
  \`<div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Immediate Action Threshold</label>
                  <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', fontSize: '0.82rem', fontWeight: 700 }}>
                    Score &ge; 90 (🔥 Immediate Contact Today Tier)
                  </div>
                </div>\`,
  \`<div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Immediate Action Threshold (Score &ge;)</label>
                  <input
                    type="number"
                    value={immediateActionThreshold}
                    onChange={(e) => setImmediateActionThreshold(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                  />
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <button
                  onClick={() => handleSaveConfig()}
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}
                >
                  <Save size={14} /> Save Configuration
                </button>\`
);

content = content.replace(
  \`<div>
                <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Default BDE Email Signature</label>
                <input
                  type="text"
                  defaultValue="Akash | BD Owner | Tiny Script Soft Tech Pvt. Ltd. (akash@tinyscript.com)"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                />
              </div>\`,
  \`<div>
                <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Default BDE Email Signature</label>
                <input
                  type="text"
                  value={defaultSignature}
                  onChange={(e) => setDefaultSignature(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                />
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <button
                  onClick={() => handleSaveConfig()}
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}
                >
                  <Save size={14} /> Save Configuration
                </button>
              </div>\`
);

content = content.replace(
  \`                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Primary Outreach Tone</label>
                  <input
                    type="text"
                    value={primaryTone}
                    onChange={(e) => setPrimaryTone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                  />
                </div>\`,
  \`                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Primary Outreach Tone</label>
                  <input
                    type="text"
                    value={primaryTone}
                    onChange={(e) => setPrimaryTone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Secondary Outreach Tone</label>
                  <input
                    type="text"
                    value={secondaryTone}
                    onChange={(e) => setSecondaryTone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tertiary Outreach Tone</label>
                  <input
                    type="text"
                    value={tertiaryTone}
                    onChange={(e) => setTertiaryTone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Weekly Limit</label>
                  <input
                    type="number"
                    value={weeklyLimit}
                    onChange={(e) => setWeeklyLimit(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                  />
                </div>\`
);

fs.writeFileSync(pagePath, content);
console.log('Replacements completed successfully.');
