const request = require('request')
const fs = require('fs');

const Network = require("@maticnetwork/meta/network")
const Matic = require("@maticnetwork/maticjs").default
const config = require('../config.json')

const network = new Network(config.network, config.version)
const MaticNetwork = network.Matic 
const MainNetwork = network.Main 

const ChildTokenAddress = config.ChildTokenAddress ||  MaticNetwork.Contracts.Tokens.TestToken
const RootTokenAddress = config.RootTokenAddress || MainNetwork.Contracts.Tokens.TestToken

const ChildTokenABI = network.abi("ChildERC20")
const RootTokenABI = network.abi("ChildERC20")

// console.log(MaticNetwork)

const matic = new Matic({
    maticProvider: MaticNetwork.RPC,
    parentProvider: MainNetwork.RPC,
    rootChain: MainNetwork.Contracts.RootChain,
    withdrawManager: MainNetwork.Contracts.WithdrawManagerProxy,
    depositManager: MainNetwork.Contracts.DepositManagerProxy,
    registry: MainNetwork.Contracts.Registry
})

let childWeb3, rootWeb3, acc1, acc2, amount
let ChildTokenContract, RootTokenContract


function PromiseTimeout(delayms) {
    return new Promise(function(resolve, reject) {
      setTimeout(resolve, delayms)
    })
}

async function init () {
    await matic.initialize()
    await matic.setWallet(config.privateKey1)
    await matic.setWallet(config.privateKey2)

    childWeb3 = matic.web3Client.getMaticWeb3()
    rootWeb3 = matic.web3Client.getParentWeb3()

    acc1 = childWeb3.eth.accounts.wallet[0].address
    acc2 = childWeb3.eth.accounts.wallet[1].address

    amount = config.value || 1

    console.log('connected to, ')
    console.log(
        ' root provider', rootWeb3.currentProvider.host, '\n',
        'child provider', childWeb3.currentProvider.host, '\n'
    )

    console.log('added accounts to wallet, ')
    console.log (
        ' acc1', acc1, '\n', 'acc2', acc2, '\n'
    )
    console.log('tokens addded,')
    console.log (
        ' root', RootTokenAddress, '\n', 'child', ChildTokenAddress, '\n'
    )
}

async function initContracts () {
    ChildTokenContract = new childWeb3.eth.Contract(ChildTokenABI, ChildTokenAddress)
    
    RootTokenContract = new rootWeb3.eth.Contract(RootTokenABI, RootTokenAddress)
}

async function getBalances (root,child, acc1, acc2) {
    let result = {}

    let rootAcc1 = await root.methods.balanceOf(acc1).call()

    let rootAcc2 = await root.methods.balanceOf(acc2).call()

    let childAcc1 = await child.methods.balanceOf(acc1).call()

    let childAcc2 = await child.methods.balanceOf(acc2).call()

    result = {
        'parent': {
            'acc1': childWeb3.utils.fromWei(rootAcc1, 'ether'),
            'acc2': childWeb3.utils.fromWei(rootAcc2, 'ether')
        },
        'child': {
            'acc1': childWeb3.utils.fromWei(childAcc1, 'ether'),
            'acc2': childWeb3.utils.fromWei(childAcc2,'ether')
        }
    }

    return result;
}

async function displayBalances() {
    console.log('\nbalances:')
    balances = await getBalances(RootTokenContract, ChildTokenContract, acc1, acc2)
    
    console.log(
        ' parent, acc1\t', balances.parent.acc1, '\n',
        'parent, acc2\t', balances.parent.acc2, '\n',
        'child, acc1\t', balances.child.acc1, '\n',
        'child, acc2\t', balances.child.acc2, '\n'
    )
}

async function testDeposit(token, account) {

    await matic.approveERC20TokensForDeposit(token, amount, {
        from: account, 
        // gas: 8000000,
        // gasPrice: '10000000000'
    }).then((r) => console.log('approval succesful, ', r.transactionHash))

    await matic.depositERC20ForUser(token, account, amount, { 
        from: account, 
        // gas: 8000000,
        // gasPrice: '100000000000'
    }).then((r) => {
        console.log('deposit successful; tx hash, ', r.transactionHash)
    })
}

async function testTransfer(account1, account2, token) {
    await matic.transferERC20Tokens(token, account2, amount, {
        from: account1,
    }).then((res)=>{
        console.log("transfer successful; tx hash,", res.transactionHash)
    })
}

async function startWithdraw(account, token) {
    await matic.startWithdraw(token, amount, {
        from: account
    }).then((r) => {
        hash = r.transactionHash
        console.log('initiated withdraw, ', hash)
    })
    return hash
}

async function getProofOfBurn(hash) {
    let url = MaticNetwork.SyncerAPI + '/tx/' + hash

    await request(url, { json: true }, (err, res, body) => {
        if (err) { return console.log(err); }
    }).pipe(fs.createWriteStream('transactionBlock.json'))
}

async function test() {
    await init () 
    await initContracts ()

    await displayBalances()

    await testDeposit(RootTokenAddress, acc1)
    await PromiseTimeout (7000)

    await displayBalances()

    await testTransfer(acc1, acc2, ChildTokenAddress)

    await PromiseTimeout(3000)
    await displayBalances()

    const hash = await startWithdraw(acc2, ChildTokenAddress)

    // wait 10 sec
    await PromiseTimeout(10000)

    await getProofOfBurn(hash)
    await displayBalances()

    console.log('\nrun `complete-withdraw` to check status of checkpoint submission, if successful, the script will run further necessary steps and will display the updated balances.')
}

test()

// console.log(MainNetwork.Contracts.DepositManager)