const { getAddress } = require('@ethersproject/address');
const ethers = require('ethers');
const routerABI = require('./abi/ruby_router.json');
const erc20ABI = require('./abi/erc20.json');
const pairABI = require('./abi/pair.json');
const factoryABI = require('./abi/factory.json');
const credentials = require('./config/config.json');

const provider = new ethers.providers.JsonRpcProvider(credentials.rpc.schainRuby);

const privateKey = credentials.account.rubyKey;

const publicAddress = credentials.account.rubyAddress;

const wallet = new ethers.Wallet(privateKey);

// creates the Signer abstract class => into the Signer client
const account = wallet.connect(provider);

const timerSpeed = credentials.tools.s10;

const routerContract = new ethers.Contract(credentials.rubyexchange.router, routerABI, account);

let fromContract;
let toContract;
let decimalDigitTokenA;
let decimalDigitTokenB;
let originalAmount = credentials.swap.amount;

/*

pricing 

*/
async function comparePrices(tokenA, tokenB) {
    const factoryAddress = await routerContract.factory();
    const factoryContract = new ethers.Contract(factoryAddress, factoryABI, account);

    const pairAddress = await factoryContract.getPair(tokenA, tokenB);
    const pairContract = new ethers.Contract(pairAddress, pairABI, account);
    const pairReserves = await pairContract.getReserves();

    const from_Contract = new ethers.Contract(tokenA, erc20ABI, account);
    const to_Contract = new ethers.Contract(tokenB, erc20ABI, account);

    const decimalA = await from_Contract.decimals();
    const decimalB = await to_Contract.decimals();

    const pairA = pairReserves[1];//ruby
    const pairB = pairReserves[0];//usd

    // only works on stable pairs which is fine for ruby since all pairs are based in USD
    const priceBetter = ethers.utils.formatUnits(pairB.toString(), decimalB) / ethers.utils.formatUnits(pairA.toString(), decimalA);

    return priceBetter;

}
/*
 buy on the cheapest pool
 sell on the most expensive pool
*/
async function getPair() {
    //check all the prices and compare to find the cheapest 
    const a = await comparePrices(credentials.rubyexchange.assets.rubyContract, credentials.rubyexchange.assets.usdpContract);
    const b = await comparePrices(credentials.rubyexchange.assets.rubyContract, credentials.rubyexchange.assets.usdcContract);
    const c = await comparePrices(credentials.rubyexchange.assets.rubyContract, credentials.rubyexchange.assets.usdtContract);

    if (Math.min(a, b, c) == a) {
        fromContract = new ethers.Contract(credentials.rubyexchange.assets.usdpContract, erc20ABI, account);
        toContract = new ethers.Contract(credentials.rubyexchange.assets.rubyContract, erc20ABI, account);
        decimalDigitTokenA = await fromContract.decimals();
        decimalDigitTokenB = await toContract.decimals();
        return [credentials.rubyexchange.assets.usdpContract, credentials.rubyexchange.assets.rubyContract]
    }

    if (Math.min(a, b, c) == b) {
        fromContract = new ethers.Contract(credentials.rubyexchange.assets.usdcContract, erc20ABI, account);
        toContract = new ethers.Contract(credentials.rubyexchange.assets.rubyContract, erc20ABI, account);
        decimalDigitTokenA = await fromContract.decimals();
        decimalDigitTokenB = await toContract.decimals();
        return [credentials.rubyexchange.assets.usdcContract, credentials.rubyexchange.assets.rubyContract]
    }

    if (Math.min(a, b, c) == c) {
        fromContract = new ethers.Contract(credentials.rubyexchange.assets.usdtContract, erc20ABI, account);
        toContract = new ethers.Contract(credentials.rubyexchange.assets.rubyContract, erc20ABI, account);
        decimalDigitTokenA = await fromContract.decimals();
        decimalDigitTokenB = await toContract.decimals();
        return [credentials.rubyexchange.assets.usdtContract, credentials.rubyexchange.assets.rubyContract]
    }
}
/*
working
    - Check the allowance amount given to the router
    - Increase the allowance if necessary
    - Function should be checked before each swap to ensure the transaction can go through (refactor later)
*/
async function doApproval() {

    const weiAmount = ethers.utils.parseUnits(credentials.swap.amount, 'ether');

    let allowanceAmount = await fromContract.allowance(publicAddress, credentials.rubyexchange.router);

    console.log("Router Contract Allowance: " + allowanceAmount.toString(), allowanceAmount);

    if (allowanceAmount.toString() == "0" || weiAmount.toString() >= allowanceAmount.toString()) {

        console.log("Router Contract Needs Increased Allowance: ");

        const multiplier = parseInt(credentials.tools.maxTrades);

        const increase = weiAmount.mul(multiplier);

        const parse = await fromContract.approve(credentials.rubyexchange.router, increase);

        const receipt = await parse.wait();

        console.log("Router Contract Result: ", receipt);
    }

    console.log("Router Contract Allowance Complete");
}

/*
    Old
    const address = await account.getAddress();
    let try_new = ethers.utils.formatUnits(originalAmount, 6);// 1 turns into 0.000001
    const weiAmount = ethers.utils.parseUnits(originalAmount, 'ether');
*/

async function doSwap() {


    const selectPool = await getPair();// Sets the to and from Contract Addresses automatically 

    const chechApprovalValue = await doApproval();

    const fromToken = selectPool[0];
    const toToken = selectPool[1];

    //Provider 
    const gas_try = await provider.getGasPrice();

    const try_string = gas_try.toString();

    const blockNumber = await provider.getBlockNumber();

    const blockData = await provider.getBlock(blockNumber);

    const expiryDate = ethers.BigNumber.from(blockData.timestamp + 23600);

    console.log("Swap Expires: " + expiryDate + " | Time: " + blockData.timestamp);

    //Signer 
    const nonce = await account.getTransactionCount("latest");

    console.log("TransactionCount: " + nonce);

    const weiAmount = ethers.utils.parseUnits(originalAmount, decimalDigitTokenA);

    const price_try = await routerContract.getAmountsOut(weiAmount, [fromToken, toToken]);

    const amountOut = price_try[1].sub(price_try[1].div(8));// 10++% slippage - put this value within config

    console.log("AmountsINN: ", weiAmount.toString());
    console.log("AmountsOUT: ", amountOut.toString());

    let swap_tx = '';


    if (credentials.swap.type == 'A') {
        swap_tx = await routerContract.swapExactETHForTokens(
            amountOut,// amountOutMin
            [fromToken, toToken],
            publicAddress,
            expiryDate,

            {
                "gasPrice": try_string,
                "gasLimit": "280000",
                "nonce": nonce,
                "value": weiAmount
            }

        ).then(result => {
            // result is another promise =. deal with it 
            let out = result.wait().then(ok => {
                console.log("Result: ", ok);
            }).catch(err => {
                console.log("Result Error: ", err);
            });
        }).catch(err => {
            console.log("Processing Error: ", err);
        });
        //   let receipt = await swap_tx.wait(); // wait for 1 block
        //   console.log("SwapReceipt: ", receipt); // sanity check
    }

    if (credentials.swap.type == 'B') {
        swap_tx = await routerContract.swapExactTokensForETH(
            weiAmount,// amountIn
            amountOut,// amountOutMin
            [fromToken, toToken],
            publicAddress,
            expiryDate,

            {
                "gasPrice": try_string,
                "gasLimit": "280000",
                "nonce": nonce,
            }

        ).then(result => {
            // result is another promise =. deal with it 
            let out = result.wait().then(ok => {
                console.log("Result: ", ok);
            }).catch(err => {
                console.log("Result Error: ", err);
            });
        }).catch(err => {
            console.log("Processing Error: ", err);
        });
        //   let receipt = await swap_tx.wait(); // wait for 1 block
        //   console.log("SwapReceipt: ", receipt); // sanity check
    }

    if (credentials.swap.type == 'C') {
        swap_tx = await routerContract.swapExactTokensForTokens(
            weiAmount,// amountIn
            amountOut,// amountOuMin
            [fromToken, toToken],
            publicAddress,
            expiryDate,

            {
                "gasPrice": try_string,
                "gasLimit": "280000",
                "nonce": nonce
            }

        ).then(result => {
            // result is another promise =. deal with it 
            let out = result.wait().then(ok => {
                console.log("Result: ", ok);
            }).catch(err => {
                console.log("Result Error: ", err);
            });
        }).catch(err => {
            console.log("Processing Error: ", err);
        });
        //   let receipt = await swap_tx.wait(); // wait for 1 block
        //   console.log("SwapReceipt: ", receipt); // sanity check
    }

    if (credentials.swap.type == 'D') {
        swap_tx = await routerContract.swapTokensForExactTokens(
            amountOut,// amountOut
            weiAmount,// amountInMax
            [fromToken, toToken],
            publicAddress,
            expiryDate,

            {
                "gasPrice": try_string,
                "gasLimit": "280000",
                "nonce": nonce
            }

        ).then(result => {
            // result is another promise =. deal with it 
            let out = result.wait().then(ok => {
                console.log("Result: ", ok);
            }).catch(err => {
                console.log("Result Error: ", err);
            });
        }).catch(err => {
            console.log("Processing Error: ", err);
        });
        //  let receipt = await swap_tx.wait(); // wait for 1 block
        //  console.log("SwapReceipt: ", receipt); // sanity check
    }
};


function run() {
    console.log("Bot is running... after timerSpeed expires, the bot will perform an action");
    setInterval(doSwap, timerSpeed);
};

run();

