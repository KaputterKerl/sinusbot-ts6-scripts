registerPlugin({
    name: 'Soundboard',
    version: '0.2.0',
    description: 'Plays short mp3 sounds from a folder (!sb lists them, !sb <name> plays one). Meant for its own bot instance next to the music bot, so it never interrupts the music.',
    author: 'KaputterKerl',
    requiredModules: ['fs'],
    vars: [
        { name: 'folder', title: 'Sound folder (mp3 files)', type: 'string', placeholder: '/opt/sinusbot/data/sounds' },
        { name: 'baseUrl', title: 'HTTP url that serves the same folder (playURL cannot play local paths)', type: 'string', placeholder: 'http://127.0.0.1:8098/' },
        { name: 'prefix', title: 'Command prefix', type: 'string', placeholder: '!' },
        { name: 'command', title: 'Command name', type: 'string', placeholder: 'sb' }
    ]
}, function (_, config) {
    var event = require('event');
    var media = require('media');
    var engine = require('engine');
    var fs = require('fs');

    var prefix = config.prefix || '!';
    var command = (config.command || 'sb').toLowerCase();
    var folder = (config.folder || '/opt/sinusbot/data/sounds').replace(/\/+$/, '');
    var baseUrl = (config.baseUrl || 'http://127.0.0.1:8098/').replace(/\/*$/, '/');

    function log(msg) { engine.log('[soundboard] ' + msg); }

    function reply(ev, text) {
        if (ev.mode === 1 && ev.client) ev.client.chat(text);
        else if (ev.channel) ev.channel.chat(text);
        else if (ev.client) ev.client.chat(text);
    }

    function listSounds() {
        var files;
        try { files = fs.readDir(folder); } catch (e) { log('readDir failed: ' + e); return null; }
        // readDir returns FileInfo objects
        files = (files || []).map(function (f) { return typeof f === 'string' ? f : (f && f.name ? f.name() : ''); });
        return files.filter(function (f) { return /\.mp3$/i.test(f); })
            .map(function (f) { return f.replace(/\.mp3$/i, ''); })
            .sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
    }

    function find(names, wanted) {
        var w = wanted.toLowerCase();
        var exact = names.filter(function (n) { return n.toLowerCase() === w; });
        if (exact.length) return { hit: exact[0] };
        var part = names.filter(function (n) { return n.toLowerCase().indexOf(w) !== -1; });
        if (part.length === 1) return { hit: part[0] };
        return { options: part };
    }

    event.on('chat', function (ev) {
        if (!ev.client || ev.client.isSelf()) return;
        var text = (ev.text || '').trim();
        if (text.indexOf(prefix) !== 0) return;
        var parts = text.substr(prefix.length).split(/\s+/);
        if (parts.shift().toLowerCase() !== command) return;
        var arg = parts.join(' ').trim();

        var names = listSounds();
        if (!names) return reply(ev, 'Sound folder not readable: ' + folder);
        if (!arg) {
            if (!names.length) return reply(ev, 'No sounds found.');
            // one sound per line, split into several messages when long
            var chunks = [], chunk = '';
            names.forEach(function (n) {
                if (chunk.length + n.length > 800) { chunks.push(chunk); chunk = ''; }
                chunk += '\n' + n;
            });
            if (chunk) chunks.push(chunk);
            chunks.forEach(function (c, i) { reply(ev, (i === 0 ? '\n[b]Sounds (' + names.length + '):[/b]' : '') + c); });
            return;
        }
        var r = find(names, arg);
        if (!r.hit) {
            return reply(ev, r.options.length
                ? 'Did you mean: ' + r.options.slice(0, 10).join(', ') + '?'
                : 'No sound "' + arg + '". ' + prefix + command + ' lists all.');
        }
        var url = baseUrl + encodeURIComponent(r.hit) + '.mp3';
        log('play ' + url);
        media.playURL(url);
    });
});
