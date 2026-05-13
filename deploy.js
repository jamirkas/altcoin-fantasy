/**
 * Deploy FantasyLeague to Base Sepolia testnet
 * Usage: node deploy.js <PRIVATE_KEY>
 */
const { ethers } = require('ethers');
const solc = require('solc');
const fs = require('fs');
const path = require('path');

async function main() {
  const privateKey = process.argv[2];
  if (!privateKey) {
    console.error('Usage: node deploy.js <PRIVATE_KEY>');
    console.error('Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia');
    process.exit(1);
  }

  // Compile contract
  const source = fs.readFileSync(path.join(__dirname, 'contracts', 'FantasyLeague.sol'), 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'FantasyLeague.sol': { content: source } },
    settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } },
  };

  console.log('Compiling...');
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    for (const err of output.errors) {
      if (err.severity === 'error') {
        console.error('Compile error:', err.formattedMessage);
        process.exit(1);
      }
    }
  }

  const contract = output.contracts['FantasyLeague.sol']['FantasyLeague'];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log('Contract compiled. Size:', bytecode.length / 2, 'bytes');

  // Deploy to Base Sepolia
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  const wallet = new ethers.Wallet(privateKey, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log('Deployer:', wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  if (balance < ethers.parseEther('0.01')) {
    console.error('Not enough ETH. Get from faucet: https://www.alchemy.com/faucets/base-sepolia');
    process.exit(1);
  }

  console.log('Deploying FantasyLeague...');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const instance = await factory.deploy();
  await instance.waitForDeployment();

  const addr = await instance.getAddress();
  console.log('✅ Deployed at:', addr);
  console.log('');

  // Save ABI + address for frontend
  const deployment = {
    address: addr,
    abi: abi,
    network: 'base-sepolia',
    chainId: 84532,
  };
  fs.writeFileSync(
    path.join(__dirname, 'deployment.json'),
    JSON.stringify(deployment, null, 2)
  );

  // Save for frontend
  fs.writeFileSync(
    path.join(__dirname, 'frontend', 'src', 'app', 'contract.ts'),
    `export const CONTRACT_ADDRESS = '${addr}';\n` +
    `export const CONTRACT_ABI = ${JSON.stringify(abi)} as const;\n`
  );

  console.log('Saved to deployment.json and frontend/src/app/contract.ts');
  console.log('');
  console.log('Next: update frontend/src/app/page.tsx with CONTRACT_ADDRESS');

  // Create first tournament
  console.log('Creating first tournament...');
  const now = Math.floor(Date.now() / 1000);
  const deadline = now + 86400; // 24h from now
  const endTime = deadline + 7 * 86400; // 1 week after deadline

  const tx = await instance.createTournament(
    ethers.parseEther('0.001'), // 0.001 ETH entry
    deadline,
    endTime,
    1000 // 10% protocol fee
  );
  await tx.wait();
  console.log('✅ Tournament #1 created!');
  console.log('  Draft deadline:', new Date(deadline * 1000).toISOString());
  console.log('  End time:', new Date(endTime * 1000).toISOString());
}

main().catch(console.error);
