Start local node:

```npx hardhat node```

You might find this error: Error HH604: Error running JSON-RPC server: error:0308010C:digital envelope routines::unsupported
If so, use the last lts version of node:

```nvm install --lts```
```nvm use --lts```

Run deploy.js script on hardhat local network

```npx hardhat run src/backend/scripts/deploy.js --network localhost```

Run tests

```npx hardhat test```