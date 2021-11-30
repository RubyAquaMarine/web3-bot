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
// using one of the following  Wallet, VoidSigner, JsonRpcSigner
const account = wallet.connect(provider);

const timerSpeed = credentials.tools.s10;

const routerContract = new ethers.Contract(credentials.rubyexchange.router, routerABI, account);

const fromToken = credentials.swap.fromAddress;

const toToken = credentials.swap.toAddress;

const fromContract = new ethers.Contract(credentials.swap.fromAddress, erc20ABI, account);
const toContract = new ethers.Contract(credentials.swap.toAddress, erc20ABI, account);

//var
let balance = '';
let gas_try = '';
let try_string = '';
let decimalDigitTokenA = '';
let decimalDigitTokenB = '';
let symbolTokenA = '';
let symbolTokenB = '';
let originalAmount = credentials.swap.amount;

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

async function saveData() {
    balance = await provider.getBalance(publicAddress);
    gas_try = await provider.getGasPrice();
    try_string = gas_try.toString();
    decimalDigitTokenA = await fromContract.decimals();
    decimalDigitTokenB = await toContract.decimals();
    symbolTokenA = await fromContract.symbol();
    symbolTokenB = await toContract.symbol();

    let textOut = "------------------------" + 
    "\nSymbol: " + symbolTokenA + "-" + symbolTokenB + 
    "\nDigits: " + decimalDigitTokenA + "-" + decimalDigitTokenB + 
    "\nGas: " + try_string + 
    "\nskETH GasBalance: " + ethers.utils.formatUnits(balance.toString(), 18) + 
    "\n------------------------";
    console.log(textOut);

}
/*
    Old
    const address = await account.getAddress();
    let try_new = ethers.utils.formatUnits(originalAmount, 6);// 1 turns into 0.000001
    const weiAmount = ethers.utils.parseUnits(originalAmount, 'ether');
*/

async function doSwap() {
   
    //Provider 
    const blockNumber = await provider.getBlockNumber();

    const blockData = await provider.getBlock(blockNumber);

    const expiryDate = ethers.BigNumber.from(blockData.timestamp + 23600);

    console.log("Swap Expires: " + expiryDate + " | Time: " + blockData.timestamp);

    //Signer 
    const nonce = await account.getTransactionCount("latest");

    console.log("TransactionCount: " + nonce);

    const weiAmount = ethers.utils.parseUnits(originalAmount, decimalDigitTokenA);

    const price_try = await routerContract.getAmountsOut(weiAmount, [fromToken, toToken]);
/*
    const factoryAddress = await routerContract.factory();

    const factoryContract = new ethers.Contract(factoryAddress, factoryABI, account);

    const pairAddress = await factoryContract.getPair(fromToken, toToken);

    const pairContract = new ethers.Contract(pairAddress, pairABI, account);

    const pairReserves = await pairContract.getReserves();

    const pairA = pairReserves[0];
    const pairB = pairReserves[1];

    const price = pairA.div(pairB);

    console.log("Price: " + price + " [0]: " + pairA + " [1]: " + pairB);
*/
    const amountOut = price_try[1].sub(price_try[1].div(8));// 10++% slippage

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
    saveData();
    doApproval();
    setInterval(doSwap, timerSpeed);
};

run();

