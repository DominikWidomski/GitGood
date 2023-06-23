#!/usr/bin/env node

const path = require('path');
const Table = require('cli-table2');
const inquirer = require('inquirer');
const readline = require('readline');

// proxy clearScreenDown
// const _clearScreenDown = readline.clearScreenDown;
// readline.clearScreenDown = function (...args) {
// 	_clearScreenDown(...args);
// }

process
	.on('unhandledRejection', (reason, p) => {
		console.error(reason, 'Unhandled Rejection at Promise', p);
	})
	.on('uncaughtException', err => {
		console.error(err, 'Uncaught Exception thrown');
		process.exit(1);
	});

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const clearScreen = () => {
	readline.cursorTo(rl, 0, 0);
	// readline.moveCursor(rl, 0, -this.buffer.length);
	readline.clearScreenDown(rl);
};

/**
 * Objective:
 * I'd like to be able to see the history of a file, what lines were changed in which commit etc.
 * 
 * TODO:
 * - [ ] Simple mapping to the commands, accepting arguments from process
 * 		- [ ] Add, Commit
 * 		- [ ] Rebase
 * 		- [ ] Auto fixup
 */

/**
 * Status is actually some enum numbers from C lib
 * https://libgit2.github.com/libgit2/#HEAD/type/git_status_t
 * https://github.com/nodegit/nodegit/blob/78765bf811b35c4539f83f3b57d10a9333a7b3a3/lib/status_file.js#L78
 * https://gist.github.com/corymartin/2393268
 * http://www.alanzucconi.com/2015/07/26/enum-flags-and-bitwise-operators/
 * ... HOW TO WORK WITH THIS?
 * !!(FLAG & value)...
 * where to even get the flags?
 */

const mapStatus = status => ({
	CURRENT: 'current',
	INDEX_NEW: 'new (i)',
	INDEX_MODIFIED: 'modified (i)',
	INDEX_DELETED: 'deleted (i)',
	INDEX_RENAMED: 'renamed (i)',
	INDEX_TYPECHANGE: 'typechange (i)',
	WT_NEW: 'new (wt)',
	WT_MODIFIED: 'modified (wt)',
	WT_DELETED: 'deleted (wt)',
	WT_TYPECHANGE: 'typechange (wt)',
	WT_RENAMED: 'renamed (wt)',
	WT_UNREADABLE: 'unreadable (wt)',
	IGNORED: 'ignored',
	CONFLICTED: 'conflicted',
}[status]);

const outputFiles = statusFiles => {
	const head = ['status', 'file', 'flags, nfiles, similarity, status'];
	const table = new Table({ head });

	const headToIndex = (statusFile) => Object.values({
		flags: statusFile.headToIndex()?.flags(),
		// newFile: statusFile.headToIndex()?.newFile(),
		nfiles: statusFile.headToIndex()?.nfiles(),
		// oldFile: statusFile.headToIndex()?.oldFile(),
		similarity: statusFile.headToIndex()?.similarity(),
		status: statusFile.headToIndex()?.status(),
	}).join(', ');

	if (statusFiles.length) {
		statusFiles.forEach(statusFile => {
			table.push([
				mapStatus(statusFile.status()),
				statusFile.path(),
				headToIndex(statusFile)
			]);
		});
	} else {
		table.push([{
			colSpan: head.length,
			content: 'No files'
		}])
	}

	console.log(table.toString());
};

const filterIndexedFiles = statusFiles => {
	return statusFiles.filter(file => {
		return file.status().find(statusString => statusString.startsWith('INDEX_'));
	});
}

const filterWTFiles = statusFiles => {
	return statusFiles.filter(file => {
		return file.status().find(statusString => statusString.startsWith('WT_'));
	});
}

// I think there is specifically an issue with this with the output buffer
const showStatus = (statusFiles) => {
	console.log("STAGED");
	outputFiles(filterIndexedFiles(statusFiles));

	console.log("WORKING DIR");
	outputFiles(filterWTFiles(statusFiles));
}

const getWorkingDirFiles = statusFiles => {
	return inquirer.prompt([
		{
			message: "Which working dir file?",
			// type: "list",
			type: "checkbox",
			name: "files",
			choices: filterWTFiles(statusFiles).map(statusFile => ({
				value: statusFile,
				name: statusFile.path(),
				short: statusFile.path(),
			}))
		}
	]);
}

const getStagedFiles = statusFiles => {
	return inquirer.prompt([
		{
			message: "Which staged file?",
			// type: "list",
			type: "checkbox",
			name: "files",
			choices: filterIndexedFiles(statusFiles).map(statusFile => ({
				value: statusFile,
				name: statusFile.path(),
				short: statusFile.path(),
			}))
		}
	]);
};

const deconstructArguments = () => {
	const args = process.argv.slice(2);

	return args;
}

const arguments = deconstructArguments();

const Git = require('simple-git');
const nodegit = require('nodegit');
const codes = nodegit.Status.STATUS;
const Diff = nodegit.Diff;
const Commit = nodegit.Commit;

const repos = {
	// self: __dirname,
	self: process.cwd(),
	testRepo: path.resolve("../testRepo")
	// iris: '/Users/dddom/Dev/iprimarycare/iris',
	// lbx: '/Users/dddom/Dev/lbx/lbx-alphapoint-client',
	// justin: '/Users/dddom/Dev/dominikwidomski/justin-bot'
}

/**
 * Gets Git repo information
 */
async function main() {
	// const repo = Git(repos.justin)
	const cwd = process.cwd();
	console.log(`CWD: ${cwd}`);
	const repo = Git(cwd);

	let funcResolve;
	const promise = new Promise(resolve => {
		funcResolve = resolve;
	})

	let files = [];
	repo.status(function (err, status) {
		console.log('status:', status);

		files = status.files;

		console.log('files:', files);

		const filePath = files[0].path
		console.log('first file:', filePath);

		repo.log({
			file: filePath
		}, function (err, log) {
			console.log(log.latest);
		})

		funcResolve?.();	
	});

	// console.log(repo.constructor.prototype.tags.toString());
	return promise;
}

/**
 * Displays current working directory status and provides some options
 */
async function main2() {
	// Error handling, if no repo found
	// Also, complains about refs/heads/master not found initially
	// maybe a way of initialising the master branch if not there?
	// console.log('Opening repo:', repos.self);
	const repo = await nodegit.Repository.open(repos.testRepo);
	// const currentBranchRef = await repo.getCurrentBranch();
	// const branchRef = await repo.getBranch(currentBranchRef);
	let statusFiles = await repo.getStatusExt();
	let index;

	// const commit = await repo.getCommit(branchRef);
	const commit = await repo.getMasterCommit();
	// const commit = await repo.getHeadCommit();

	// console.log(branchRef);
	// console.log(commit.message());

	showStatus(statusFiles);
	let action;

	while (!action || action !== "exit") {
		action = (await inquirer.prompt([{
			message: "What do?",
			type: 'list',
			name: 'action',
			choices: ["stage", "unstage", "commit", "status", "exit"]
		}])).action;

		index = await repo.refreshIndex();
		statusFiles = await repo.getStatusExt();

		clearScreen();
		showStatus(statusFiles);

		if (action === "stage") {
			let { files } = await getWorkingDirFiles(statusFiles);

			if (!Array.isArray(files)) {
				files = [files];
			}

			for (const statusFile of files) {
				// const diff = statusFile.indexToWorkdir();
				const result = await index.addByPath(statusFile.path());
				// commit -> getDiff -> patches -> hunks:ConvenientHunk[] -> lines:DiffLine[]	
				// await repo.stageLines(statusFile.path(), selectedDiffLines, false);
			};

			await index.write();
		} else if (action === "unstage") {
			let { files } = await getStagedFiles(statusFiles);

			if (!Array.isArray(files)) {
				files = [files];
			}

			for (const statusFile of files) {
				const headRef = await nodegit.Reference.nameToId(repo, "HEAD");
				const headCommit = await repo.getCommit(headRef);
				const result = await nodegit.Reset.default(repo, headCommit, statusFile.path());
			}

			await index.write();
		} else if (action === "commit") {
			const oid = await index.writeTree();
			const headRef = await nodegit.Reference.nameToId(repo, "HEAD");
			const headCommit = await repo.getCommit(headRef);

			// TODO: the time was wrong (was creating commits in the future? lol)
			const time = (new Date()).getTime() / 1000;
			// TODO: also, the last parameter is timezone offset, do I need it?
			var author = nodegit.Signature.create("Dominik Widomski", "dominik@digital-detox.co.uk", time, 60);
			var committer = nodegit.Signature.create("Dominik Widomski", "dominik@digital-detox.co.uk", time, 90);

			const { message } = await inquirer.prompt({
				type: 'editor',
				message: 'Commit messsage',
				name: 'message'
			});

			if (message.length === 0) {
				throw new Error("Please provide a commit message");
			}

			const commit = await repo.createCommit("HEAD", author, committer, message, oid, [headCommit]);
		}
	}

	// Questions
	// - [ ] Can I see what's in working dir / staging?
	// - [ ] Can I see that line by line?
	// - [ ] Can I see when those things were last modified?
	// - [ ] Can I commit line by line?
}

/**
 * https://stackoverflow.com/questions/5006821/nodejs-how-to-read-keystrokes-from-stdin#
 * https://stackoverflow.com/questions/10585683/how-do-you-edit-existing-text-and-move-the-cursor-around-in-the-terminal/10830168#10830168
 * 
 * simple input/output test
 */
async function main3() {
	const readline = require('readline');
	var stdin = process.stdin;
	// stdin.setRawMode(true);
	// stdin.setEncoding('utf8');

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false
	});

	rl.on('line', (input) => {
		console.log('RL input', input);
	});

	stdin.on('data', function (key) {
		// ctrl-c ( end of text )
		if (key === '\u0003') {
			// process.exit();
		}
		// write the key to stdout all normal like
		process.stdout.write(key);
	});

	stdin.on('keypress', function (chunk, key) {
		process.stdout.write('Get Chunk: ' + chunk + '\n');
		// if (key && key.ctrl && key.name == 'c') process.exit();
	});

	stdin.resume();
}

/**
 * Custom input/output interface test
 */
async function main4() {
	const readline = require('readline');
	process.stdin.setRawMode(true);
	process.stdin.setEncoding('utf8');

	let muted = true;

	const _write = process.stdout.write;
	process.stdout.write = function (chunk) {
		if (!muted) {
			_write.call(process.stdout, chunk + "\n", 'utf8');
		}

		// process.stdout.emit('data', chunk);
	}

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: true
	});

	// var cliCursor = require('cli-cursor');
	// cliCursor.hide();

	// var cliWidth = require('cli-width');

	const n = 3;
	let focused = 0;
	const items = Array(n).fill('item').map((item, index) => `${item} ${index}`);

	rl.input.on('keypress', (char, key) => {
		// process.stdout.write(`input keydown ${char} ${key}`);
		analyseInput(char, key);
	});

	rl.input.on('data', (char, key) => {
		// process.stdout.write(`input data ${char} ${key}`);
		// analyseInput(char, key);
	});

	// rl.output.on('data', (chunk) => {
	// 	process.stdout.write(`output data: ${chunk}`);
	// });

	function analyseInput(chunk, key) {
		if (key.name === 'down') {
			focused = (focused + 1) % n;
		}
		if (key.name === 'up') {
			focused = (focused - 1);
			if (focused < 0) {
				focused += n;
			}
		}
		render();
	}
	
	function render() {
		muted = false;

		readline.cursorTo(rl, 0, 0);
		// readline.moveCursor(rl, 0, -items.length);
		readline.clearScreenDown(rl);
		
		let buffer = items.map((item, index) => {
			return index === focused ? `> ${item}` : `  ${item}`;
		}).join('\n');

		process.stdout.write(buffer);
		
		muted = true;
	}

	render();
}

const rebase = async (rebaseOntoHash) => {
	// get repo
	const repo = await nodegit.Repository.open(repos.testRepo);
	const currentBranch = await repo.getCurrentBranch();
	const headCommit = await repo.getBranchCommit(currentBranch.name());
	
	console.log({ branchName: currentBranch.name(), commitSHA: headCommit.sha() });

	// TODO: WTF Annotated commits, whatever the fuck else???
	// get current commit
	rebase = await nodegit.Rebase.init(repo, null, null, 'c6f0a4c5bb23c4652c3fc4958ea8f83a6a57d226');
	// get the commit by the hash
}

const rebaseArgErrorMessage = (expectedIndex) => `

Argument "--rebase" requires a value.
Pass the hash of the commit to rebase on in the following argument.
(expected in position ${expectedIndex})
`;

const { exec } = require("child_process");

const runner = (options) => async (command) => {
	return new Promise((resolve, reject) => {
		exec(command, options, (error, stdout, stderr) => {
			if (error) {
				console.log(`error: \n${error.message}`);
				reject();
        return;
			}
			if (stderr) {
				console.log(`stderr: \n${stderr}`);
				reject();
        return;
			}
			console.log(`$${command}: \n${stdout}`);
			resolve(stdout);
		});
	})
}

const rebase2 = async (rebaseOntoHash) => {
	const runCommand = runner({ cwd: repos.testRepo });

	// const startingCWD = process.cwd();
	// await runCommand(`cd ${repos.testRepo}`);
	// const result = await runCommand("git stash -u");
	// Otherwise it should say "No local changes to save"
	// const stashed = result.startsWith('Saved working directory');
	// await runCommand(`cd ${startingCWD}`);

	// TODO: This might be easiest to have as a terminal alias basically or a bash function
	await runCommand(`git -c sequence.editor=: rebase -i --autosquash --autostash ${rebaseOntoHash}^`);
	
	// if(stashed) {
	// 	await runCommand('git stash pop');
	// }
}

// TODO refactor, because we don't have top level async in node 14 (I think?)
const MAIN_FUNC = async () => {
	const args = process.argv.slice(2);

	console.log("ARGUMENTS", args);

	if(args.includes("--rebase")) {
		const indexOfArg = args.indexOf("--rebase");
		const argValue = args[indexOfArg + 1];

		if(!argValue) {
			throw new Error(rebaseArgErrorMessage(indexOfArg + 1));
		}

		// await rebase(argValue);
		await rebase2(argValue);
	}


	if(args.includes("--info")) {
		await main();
	}

	if(args.includes("--status")) {
		await main2();
	}

	// main3();
	// main4();

	process.exit();
}

MAIN_FUNC();