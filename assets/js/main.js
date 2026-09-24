/* =========================================================
   CV / Portafolio — interacciones (vanilla JS, sin dependencias)
   ========================================================= */

const root = document.documentElement
const $ = (sel, ctx = document) => ctx.querySelector(sel)
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)]

const storage = {
    get(key) { try { return localStorage.getItem(key) } catch (e) { return null } },
    set(key, value) { try { localStorage.setItem(key, value) } catch (e) {} }
}

/* ---------- Tema (oscuro por defecto) ---------- */
function setTheme(theme) {
    root.dataset.theme = theme
    storage.set('cv-theme', theme)
    const meta = $('meta[name="theme-color"]')
    if (meta) meta.content = theme === 'dark' ? '#0a0c10' : '#fbfbfa'
}

function toggleTheme() {
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark')
}

$('#theme-btn').addEventListener('click', toggleTheme)

/* ---------- Spotlight que sigue al cursor ---------- */
const spotlight = $('.spotlight')
let rafId = null

window.addEventListener('pointermove', e => {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
        spotlight.style.setProperty('--x', e.clientX + 'px')
        spotlight.style.setProperty('--y', e.clientY + 'px')
        rafId = null
    })
}, { passive: true })

/* ---------- Índice: sección activa ---------- */
const tocLinks = $$('.toc__link')

const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return
        tocLinks.forEach(link => {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id)
        })
    })
}, { rootMargin: '-30% 0px -60% 0px' })

$$('.content section[id]').forEach(section => sectionObserver.observe(section))

/* ---------- Aparición suave al hacer scroll ---------- */
const revealTargets = $$('.stats, .item, .card, .cert, .refs, .stack__row')
revealTargets.forEach(el => el.classList.add('reveal'))

const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-in')
        revealObserver.unobserve(entry.target)
    })
}, { rootMargin: '0px 0px -40px 0px' })

revealTargets.forEach(el => revealObserver.observe(el))

/* Al imprimir, mostrar todo aunque no se haya hecho scroll */
window.addEventListener('beforeprint', () => revealTargets.forEach(el => el.classList.add('is-in')))

/* ---------- Descargar CV (imprimir / guardar como PDF) ---------- */
function printCv() {
    revealTargets.forEach(el => el.classList.add('is-in'))
    window.print()
}

$('#print-btn').addEventListener('click', printCv)

/* ---------- Paleta de comandos (⌘K / Ctrl+K) ---------- */
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
if (!isMac) $('#cmdk-btn').innerHTML = '<kbd>Ctrl</kbd><kbd>K</kbd>'

const cmdk = $('#cmdk')
const cmdkInput = $('#cmdk-input')
const cmdkList = $('#cmdk-list')
let lastFocus = null
let selected = 0
let visible = []

const normalize = str => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const commands = [
    ...tocLinks.map(link => ({
        group: 'Secciones',
        label: link.textContent.trim(),
        hint: link.getAttribute('href'),
        run: () => document.querySelector(link.getAttribute('href')).scrollIntoView({ behavior: 'smooth' })
    })),
    { group: 'Acciones', label: 'Cambiar tema claro / oscuro', hint: 'tema', run: toggleTheme },
    { group: 'Acciones', label: 'Descargar CV en PDF', hint: 'imprimir', run: printCv },
    {
        group: 'Acciones', label: 'Copiar enlace de este CV', hint: 'url',
        run: () => navigator.clipboard && navigator.clipboard.writeText(location.href.split('#')[0])
    },
    ...$$('.socials a').map(link => ({
        group: 'Redes',
        label: link.dataset.label,
        hint: '↗',
        run: () => window.open(link.href, '_blank', 'noopener')
    })),
    { group: 'Acciones', label: 'Moodle NG en GitHub', hint: '↗', run: () => window.open('https://github.com/Moodle-NG', '_blank', 'noopener') },
    ...$$('.verify-link').map(link => ({
        group: 'Certificados',
        label: link.dataset.label,
        hint: 'validar',
        run: () => link.click()
    })),
    ...$$('.cert-link').map(link => ({
        group: 'Certificados',
        label: link.dataset.label || 'Certificado',
        hint: 'pdf',
        run: () => link.click() /* reutiliza el onclick del enlace: abre el popup */
    }))
]

function renderCommands() {
    const query = normalize(cmdkInput.value.trim())
    visible = commands.filter(c => !query || normalize(c.label + ' ' + c.group).includes(query))
    selected = Math.min(selected, Math.max(visible.length - 1, 0))

    if (!visible.length) {
        cmdkList.innerHTML = '<li class="cmdk__empty">Sin resultados</li>'
        return
    }

    let html = ''
    let group = ''
    visible.forEach((c, i) => {
        if (c.group !== group) {
            group = c.group
            html += `<li class="cmdk__group" role="presentation">${group}</li>`
        }
        html += `<li class="cmdk__item" role="option" id="cmd-${i}" data-i="${i}" aria-selected="${i === selected}">
                    <span>${c.label}</span><small>${c.hint}</small>
                 </li>`
    })
    cmdkList.innerHTML = html
    cmdkInput.setAttribute('aria-activedescendant', 'cmd-' + selected)
    const current = $('#cmd-' + selected)
    if (current) current.scrollIntoView({ block: 'nearest' })
}

function openCmdk() {
    lastFocus = document.activeElement
    cmdk.hidden = false
    cmdkInput.value = ''
    selected = 0
    renderCommands()
    cmdkInput.focus()
}

function closeCmdk() {
    cmdk.hidden = true
    if (lastFocus) lastFocus.focus()
}

function runSelected() {
    const cmd = visible[selected]
    if (!cmd) return
    closeCmdk()
    cmd.run()
}

$('#cmdk-btn').addEventListener('click', openCmdk)
cmdkInput.addEventListener('input', () => { selected = 0; renderCommands() })

cmdkList.addEventListener('mousemove', e => {
    const item = e.target.closest('.cmdk__item')
    if (!item || +item.dataset.i === selected) return
    selected = +item.dataset.i
    $$('.cmdk__item', cmdkList).forEach(el => el.setAttribute('aria-selected', +el.dataset.i === selected))
})

cmdkList.addEventListener('click', e => {
    const item = e.target.closest('.cmdk__item')
    if (!item) return
    selected = +item.dataset.i
    runSelected()
})

cmdk.addEventListener('click', e => { if (e.target.hasAttribute('data-close')) closeCmdk() })

document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName)

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        cmdk.hidden ? openCmdk() : closeCmdk()
        return
    }
    if (cmdk.hidden) {
        if (e.key === '/' && !typing) { e.preventDefault(); openCmdk() }
        return
    }

    if (e.key === 'Escape') { e.preventDefault(); closeCmdk() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); selected = (selected + 1) % visible.length; renderCommands() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selected = (selected - 1 + visible.length) % visible.length; renderCommands() }
    else if (e.key === 'Enter') { e.preventDefault(); runSelected() }
})
