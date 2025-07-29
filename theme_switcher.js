// Create and inject theme switcher
async function createThemeSwitcher() {
    const headerEnd = document.querySelector('.AppHeader-globalBar-end');
    const searchBox = document.querySelector('.AppHeader-search');
    if (!headerEnd) return;

    // Insert loading spinner while initializing
    const loadingSpinner = createLoadingSpinner();
    if (searchBox && searchBox.parentElement === headerEnd) {
        headerEnd.insertBefore(loadingSpinner, searchBox);
    } else {
        headerEnd.appendChild(loadingSpinner);
    }

    let singleForm;
    try {
        (singleForm = await getAppearanceForms());
    } catch (err) {
        console.error(err);
        loadingSpinner.remove();
        return;
    }

    let modes, themes, authenticityToken;
    try {
        ({ modes, themes } = parseModesAndThemes(singleForm));
        authenticityToken = parseAuthenticityToken(singleForm);
    } catch (err) {
        console.error(err);
        loadingSpinner.remove();
        return;
    }

    // Render UI and get references
    const {
        modeSelect,
        themeSelect,
        spinner,
        tooltip,
        selectWrapper
    } = prepareThemeSwitcherUI({
        headerEnd,
        searchBox,
        modes,
        themes,
        loadingSpinner
    });

    // Helper to show/hide theme selector based on selected mode
    function renderThemeOptions(selectedMode) {
        if (selectedMode === 'single' && window.innerWidth >= 1360) {
            themeSelect.style.display = '';
        } else {
            themeSelect.style.display = 'none';
        }
    }

    // Assign event listeners
    modeSelect.addEventListener('change', async () => {
        renderThemeOptions(modeSelect.value);
        if (window.location.pathname === '/settings/appearance') {
            // On settings page, trigger change on the real select
            const realModeSelect = document.querySelector('#color_mode_type_select');
            if (realModeSelect) {
                realModeSelect.value = modeSelect.value;
                realModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
        }
        if (modeSelect.value !== 'single') {
            const formData = new FormData();
            formData.append('authenticity_token', authenticityToken);
            formData.append('color_mode', modeSelect.value);
            formData.append('_method', 'put');
            await updateColorMode(formData);
            document.documentElement.setAttribute('data-color-mode', modeSelect.value);
            location.reload();
        } else {
            const selectedTheme = themeSelect.value;
            if (selectedTheme?.length > 0) {
                const formData = new FormData();
                formData.append('authenticity_token', authenticityToken);
                formData.append('user_theme', selectedTheme);
                formData.append('_method', 'put');
                await updateColorMode(formData);
            }
            document.documentElement.setAttribute('data-color-mode', selectedTheme);
        }
    });

    themeSelect.addEventListener('mouseenter', (e) => {
        const rect = themeSelect.getBoundingClientRect();
        tooltip.style.setProperty('--tool-tip-position-top', `${rect.bottom + window.scrollY + 8}px`);
        tooltip.style.setProperty('--tool-tip-position-left', `${rect.left + window.scrollX}px`);
        tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.visibility = 'visible';
    });
    themeSelect.addEventListener('mouseleave', () => {
        tooltip.style.visibility = 'hidden';
    });

    themeSelect.addEventListener('change', async (e) => {
        const selectedTheme = e.target.value;
        if (window.location.pathname === '/settings/appearance') {
            clickThemeRadio(singleForm, selectedTheme);
        } else {
            showSpinner(themeSelect, spinner);
            const formData = new FormData();
            formData.append('authenticity_token', authenticityToken);
            formData.append('user_theme', selectedTheme);
            formData.append('_method', 'put');
            await updateColorMode(formData);
            updateThemeStylesheets(selectedTheme);
            setTimeout(() => {
                hideSpinner(themeSelect, spinner);
                updateThemeAttributes(selectedTheme);
                clickThemeRadio(singleForm, selectedTheme);
            }, 500);
        }
    });

    // --- Responsive Day/Night Toggle ---
    // Create the toggle row
    const toggleRow = document.createElement('div');
    toggleRow.className = 'theme-switcher-toggle-row';
    // Create labels
    const darkLabel = document.createElement('span');
    darkLabel.className = 'theme-switcher-toggle-label light';
    darkLabel.textContent = 'Dark';
    const lightLabel = document.createElement('span');
    lightLabel.className = 'theme-switcher-toggle-label light';
    lightLabel.textContent = 'Light';
    // Create the toggle
    const dayNightToggle = document.createElement('div');
    dayNightToggle.className = 'theme-switcher-toggle';
    dayNightToggle.innerHTML = `
      <div class="toggle-thumb"></div>
    `;
    // Assemble
    toggleRow.appendChild(darkLabel);
    toggleRow.appendChild(dayNightToggle);
    toggleRow.appendChild(lightLabel);
    // Insert toggle row into the wrapper
    selectWrapper.insertBefore(toggleRow, selectWrapper.firstChild);
    // --- Toggle logic ---
    function setToggleUI(isDark) {
      if (isDark) {
        dayNightToggle.classList.add('dark');
        toggleRow.classList.add('dark');
        darkLabel.className = 'theme-switcher-toggle-label dark';
        lightLabel.className = 'theme-switcher-toggle-label light';
      } else {
        dayNightToggle.classList.remove('dark');
        toggleRow.classList.remove('dark');
        darkLabel.className = 'theme-switcher-toggle-label light';
        lightLabel.className = 'theme-switcher-toggle-label dark';
      }
    }
    function getCurrentMode() {
      return document.documentElement.getAttribute('data-color-mode') === 'light';
    }
    setToggleUI(getCurrentMode());
    dayNightToggle.onclick = function() {
      const isLight = getCurrentMode();
      if (isLight) {
        setToggleUI(false);
        setTimeout(() => {
          document.documentElement.setAttribute('data-color-mode', 'dark');
          document.documentElement.setAttribute('data-dark-theme', 'dark');
          updateThemeStylesheets('dark');
          // AJAX call to update GitHub preference
          const formData = new FormData();
          formData.append('authenticity_token', authenticityToken);
          formData.append('color_mode', 'dark');
          formData.append('_method', 'put');
          updateColorMode(formData);
          themeSelect.value = 'dark';
        }, 300);
      } else {
        setToggleUI(true);
        setTimeout(() => {
          document.documentElement.setAttribute('data-color-mode', 'light');
          document.documentElement.setAttribute('data-light-theme', 'light');
          updateThemeStylesheets('light');
          // AJAX call to update GitHub preference
          const formData = new FormData();
          formData.append('authenticity_token', authenticityToken);
          formData.append('color_mode', 'light');
          formData.append('_method', 'put');
          updateColorMode(formData);
          themeSelect.value = 'light';
        }, 300);
      }
    };
    // --- Responsive logic ---
    function updateResponsiveThemeSwitcher() {
      if (window.innerWidth < 1360) {
        toggleRow.style.display = 'flex';
        modeSelect.style.display = 'none';
        themeSelect.style.display = 'none';
      } else {
        toggleRow.style.display = 'none';
        modeSelect.style.display = '';
        themeSelect.style.display = '';
      }
    }
    window.addEventListener('resize', updateResponsiveThemeSwitcher);
    updateResponsiveThemeSwitcher();

    // After inserting selectors, ensure correct visibility on every page load
    renderThemeOptions(modeSelect.value);
}

function prepareThemeSwitcherUI({
    headerEnd,
    searchBox,
    modes,
    themes,
    loadingSpinner
}) {
    // Create mode selector
    const modeSelect = document.createElement('select');
    modeSelect.className = 'form-select';
    modeSelect.id = 'github-mode-switcher-select';
    modes.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.selected) option.selected = true;
        modeSelect.appendChild(option);
    });

    // Create the theme dropdown
    const themeSelect = document.createElement('select');
    themeSelect.className = 'form-select';
    themeSelect.id = 'github-theme-switcher-select';
    themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.value;
        option.textContent = theme.label && theme.label.length > 0 ? theme.label : theme.value;
        if (theme.checked) option.selected = true;
        themeSelect.appendChild(option);
    });

    // Create a wrapper for the selectors and spinner
    const selectWrapper = document.createElement('div');
    selectWrapper.className = 'theme-switcher-wrapper';
    selectWrapper.appendChild(modeSelect);
    selectWrapper.appendChild(themeSelect);

    // Create spinner
    const spinner = document.createElement('span');
    spinner.className = 'theme-switcher-spinner';
    spinner.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="7" stroke="#57606a" stroke-width="2" opacity="0.25"/><path d="M15 8A7 7 0 1 1 8 1" stroke="#57606a" stroke-width="2" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.7s" repeatCount="indefinite"/></path></svg>`;
    selectWrapper.appendChild(spinner);

    // Create GitHub-style tooltip for theme selector
    const tooltip = document.createElement('tool-tip');
    tooltip.setAttribute('for', 'github-theme-switcher-select');
    tooltip.setAttribute('popover', 'manual');
    tooltip.setAttribute('data-direction', 's');
    tooltip.setAttribute('data-type', 'label');
    tooltip.setAttribute('data-view-component', 'true');
    tooltip.setAttribute('role', 'tooltip');
    tooltip.className = 'position-absolute sr-only';
    tooltip.textContent = 'Select GitHub theme';
    tooltip.style.position = 'absolute';
    tooltip.style.zIndex = '1000';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.visibility = 'hidden';

    // Remove loading spinner and insert the real switcher
    loadingSpinner.remove();
    if (searchBox && searchBox.parentElement === headerEnd) {
        headerEnd.insertBefore(selectWrapper, searchBox);
        headerEnd.insertBefore(tooltip, searchBox);
    } else {
        headerEnd.appendChild(selectWrapper);
        headerEnd.appendChild(tooltip);
    }

    return { modeSelect, themeSelect, spinner, tooltip, selectWrapper };
}

async function getAppearanceForms() {
    if (window.location.pathname === '/settings/appearance') {
        // Return the actual DOM element
        const forms = Array.from(document.querySelectorAll('form[action="/settings/appearance/color_mode"]'));
        const singleForm = forms.find(f => f.querySelector('input[type="radio"][name="user_theme"]'));
        if (!singleForm) throw new Error('❌ Single theme form not found in DOM');
        return singleForm;
    } else {
        const response = await fetch('https://github.com/settings/appearance', { credentials: 'include' });
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const forms = Array.from(doc.querySelectorAll('form[action="/settings/appearance/color_mode"]'));
        const singleForm = forms.find(f => f.querySelector('input[type="radio"][name="user_theme"]'));
        if (!singleForm) throw new Error('❌ Single theme form not found');
        return singleForm;
    }
}

function parseModesAndThemes(singleForm) {
    if (!(singleForm instanceof Element)) {
        throw new Error('singleForm is not a DOM element');
    }
    // Parse mode options
    const modeSelect = singleForm.ownerDocument
        ? singleForm.ownerDocument.querySelector('#color_mode_type_select')
        : document.querySelector('#color_mode_type_select');
    const modes = modeSelect ? Array.from(modeSelect.options).map(opt => ({
        value: opt.value,
        label: opt.textContent.trim(),
        selected: opt.selected
    })) : [];
    // Parse themes
    const radios = singleForm.querySelectorAll('input[type="radio"][name="user_theme"]');
    const themes = Array.from(radios).map(radio => {
        const label = singleForm.querySelector(`label[for="${radio.id}"]`);
        let labelText = radio.value;
        if (label) {
            const nameDiv = label.querySelector('div');
            if (nameDiv) {
                labelText = nameDiv.textContent.trim().replace(/\s+/g, ' ');
            } else {
                labelText = label.textContent.trim().replace(/\s+/g, ' ');
            }
        }
        return {
            value: radio.value,
            label: labelText,
            checked: radio.checked,
            mode: radio.getAttribute('data-mode') || ''
        };
    });
    return { modes, themes };
}

function parseAuthenticityToken(form) {
    const tokenInput = form.querySelector('input[name="authenticity_token"]');
    const authenticityToken = tokenInput ? tokenInput.value : null;
    if (!authenticityToken) throw new Error('❌ Authenticity token not found');
    return authenticityToken;
}

function updateThemeAttributes(selectedTheme) {
    const html = document.documentElement;
    if (selectedTheme.startsWith('light')) {
        html.setAttribute('data-color-mode', 'light');
        html.setAttribute('data-light-theme', selectedTheme);
    } else {
        html.setAttribute('data-color-mode', 'dark');
        html.setAttribute('data-dark-theme', selectedTheme);
    }
}

function updateThemeStylesheets(selectedTheme) {
    document.querySelectorAll('link[data-color-theme]').forEach(link => {
        const theme = link.getAttribute('data-color-theme');
        if (selectedTheme.startsWith(theme)) {
            link.setAttribute('href', link.getAttribute('data-href'));
            link.setAttribute('media', 'all');
        } else {
            link.removeAttribute('href');
            link.setAttribute('media', 'not all');
        }
    });
}

function clickThemeRadio(appearanceForm, selectedTheme) {
    const radio = appearanceForm.querySelector(`input[type="radio"][name="user_theme"][value="${selectedTheme}"]`);
    if (radio) radio.click();
}

function getmodes(appearanceForm) {
    const modeSelect = appearanceForm.querySelector('#color_mode_type_select');
    if (!modeSelect) return [];
    return Array.from(modeSelect.options).map(opt => ({
        value: opt.value,
        label: opt.textContent.trim(),
        selected: opt.selected
    }));
}

// Helper to create a loading spinner for the switcher
function createLoadingSpinner() {
    const wrapper = document.createElement('div');
    wrapper.className = 'theme-switcher-wrapper loading';
    const spinner = document.createElement('span');
    spinner.className = 'theme-switcher-spinner';
    spinner.style.display = 'block';
    spinner.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="7" stroke="#57606a" stroke-width="2" opacity="0.25"/><path d="M15 8A7 7 0 1 1 8 1" stroke="#57606a" stroke-width="2" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.7s" repeatCount="indefinite"/></path></svg>`;
    const text = document.createElement('span');
    text.textContent = 'Loading theme switcher...';
    text.style.color = '#57606a';
    text.style.fontSize = '14px';
    wrapper.appendChild(spinner);
    wrapper.appendChild(text);
    return wrapper;
}

function showSpinner(select, spinner) {
    select.disabled = true;
    spinner.style.display = 'block';
}

function hideSpinner(select, spinner) {
    spinner.style.display = 'none';
    select.disabled = false;
}

async function updateColorMode(payload) {
    await fetch('https://github.com/settings/appearance/color_mode', {
        method: 'POST',
        credentials: 'include',
        body: payload
    });
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', createThemeSwitcher) : createThemeSwitcher(); 