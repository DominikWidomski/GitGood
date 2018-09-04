const readline = require('readline');

// var cliCursor = require('cli-cursor');
// cliCursor.hide();

// var cliWidth = require('cli-width');

class MutedStream /* extends Stream? */ {
    constructor() {
        this._write = process.stdout.write;
        this.muted = false;
    }
    
    mute() {
        this.muted = true;
    }

    unmute() {
        this.muted = false;
    }

    // process.stdout.write = function (chunk) {
	// 	if (!muted) {
	// 		_write.call(process.stdout, chunk + "\n", 'utf8');
	// 	}

	// 	// process.stdout.emit('data', chunk);
	// }
    
    write(chunk) {
        this._write.call(process.stdout, chunk, 'utf8');
    }
}

class Prompt {
    constructor(options) {
        this.muted = true;
        this.focusedIndex = 0;

        this.options = options;
        this.height = options.split('\n').length;

        this.rl = readline.createInterface({
            input: process.stdin,
            output: new MutedStream(),
            terminal: true
        });

        this.rl.input.on('keypress', (char, key) => {
            this._analyseInput(char, key);
        });
    }

    _analyseInput(chunk, key) {
		if (key.name === 'down') {
			this.focusedIndex = (this.focusedIndex + 1) % n;
		}
		if (key.name === 'up') {
			this.focusedIndex = (this.focusedIndex - 1);
			if (this.focusedIndex < 0) {
				this.focusedIndex += n;
			}
		}
		this._render();
    }
    
    _render() {
		this.rl.output.unmute();

		readline.cursorTo(this.rl, 0, 0);
		// readline.moveCursor(this.rl, 0, -items.length);
		readline.clearScreenDown(this.rl);
		
		let buffer = this.options.map((item, index) => {
			return index === this.focused ? `> ${item}` : `  ${item}`;
		}).join('\n');

		this.rl.output.write(buffer);
		
		this.rl.output.mute();
	}
};

module.exports = Prompt;