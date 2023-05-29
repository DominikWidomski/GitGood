# GitGood

A better CLI UI for Git. Because the default one sucks.

## Features

- nada

## Running

For now just pull this and do an `npm link` in the root of the project making it available globally.
From there you can run `gid` in the root of your repo.

### Dependencies

- ~Did I need `brew install libgcrypt`?~ - didn't solve it
- make sure you have `xcode-select --install`
- `xcode-select -p` should say `/Library/Developer/CommandLineTools` if not, run `sudo xcode-select --switch /Library/Developer/CommandLineTools`
- tried `brew install gcc`... didn't fix it
- Maybe didn't have python installed.. ? `brew install python3` - didn't fix it
- Tried `pyenv`
  - `brew install pyenv`
  - `pyenv install 2.7`
  - `pyenv global 2.7.18`
  - add to terminal profile `PATH=$(pyenv root)/shims:$PATH`
- might not work on Node 18
- might work on node 14... YES
  - I was getting this, it was solved by a restart...
  - `rosetta error: Attachment of code signature supplement failed:`

Key takeaways

- python 2 (not 3)
- node 14 (nothing newer works ?)
- upgraded nodegit to 0.27

asoidahdojkhasnd