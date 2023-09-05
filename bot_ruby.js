const ethers = require('ethers');
const routerABI = require('./abi/ruby_router.json');
const nftABI = require('./abi/nft_admin.json');
const erc20ABI = require('./abi/erc20.json');
const pairABI = require('./abi/pair.json');
const factoryABI = require('./abi/factory.json');
const credentials = require('./config/config.json');

const provider = new ethers.providers.JsonRpcProvider(credentials.rpc.schain_Europa);
const privateKey = credentials.account.privateKey;
const publicAddress = credentials.account.publicAddress;
const wallet = new ethers.Wallet(privateKey);
const account = wallet.connect(provider);
/*

*/
const timerSpeed = credentials.tools.m1;
const howManySwaps = credentials.swap.maxTrades;
const fromToken = credentials.assets.europa.RUBY;
const toToken = credentials.assets.europa.USDP;

const routerContract = new ethers.Contract(credentials.amm.router, routerABI, account);

//var
let balance = '';
let gas_try = '';
let try_string = '';
let decimalDigitTokenA = '';
let decimalDigitTokenB = '';
let symbolTokenA = '';
let symbolTokenB = '';
let originalAmount = credentials.swap.amount;

async function doApproval(token) {

    let weiAmount = ethers.utils.parseUnits(originalAmount, 'ether');

    weiAmount = weiAmount.mul(howManySwaps);

    const fromContract = new ethers.Contract(token, erc20ABI, account);

    let allowanceAmount = await fromContract.allowance(publicAddress, credentials.amm.router);

    console.log("Router Contract Allowance: " + allowanceAmount.toString());

    if (allowanceAmount.toString() == "0" || weiAmount.gt(allowanceAmount)) {
        console.log("Router Contract Needs Increased Allowance: ");

        const parse = await fromContract.approve(credentials.amm.router, weiAmount);

        const receipt = await parse.wait();

        console.log("Router Contract Result: ", receipt);
    }

    console.log("Router Contract Allowance Complete: Good for " + howManySwaps + " swaps");
}

async function saveData(tokenA, tokenB) {

    const fromContract = new ethers.Contract(tokenA, erc20ABI, account);
    const toContract = new ethers.Contract(tokenB, erc20ABI, account);
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
let SwapCounter = 0;
async function doSwap() {

    SwapCounter++;

    //Provider 
    const blockNumber = await provider.getBlockNumber();

    const blockData = await provider.getBlock(blockNumber);

    const expiryDate = ethers.BigNumber.from(blockData.timestamp + 23600);

    console.log("Swap Expires: " + expiryDate + " | Time: " + blockData.timestamp);

    //Signer 
    const nonce = await account.getTransactionCount("latest");

    console.log("TransactionCount: " + nonce);

    const weiAmount = ethers.utils.parseUnits(originalAmount, decimalDigitTokenA);

    let nftAdmin = await routerContract.nftAdmin();
    const nftContract = new ethers.Contract(nftAdmin, nftABI, account);
    let fee= await nftContract.calculateAmmSwapFeeDeduction(account.address)
    console.log("DEBUG swapFee ", fee.toString()) 

    const amountOut = await routerContract.getAmountsOut(weiAmount, [fromToken, toToken], fee).then(result => {
        console.log("Result GetAmountsOut" + result);
        return result;
    }).catch(err => {
        console.log("Error getAmountsOut: ", err);
    })

    const factoryAddress = await routerContract.factory();
    const factoryContract = new ethers.Contract(factoryAddress, factoryABI, account);
    const pairAddress = await factoryContract.getPair(fromToken, toToken);
    const pairContract = new ethers.Contract(pairAddress, pairABI, account);
    const pairReserves = await pairContract.getReserves();

    const pairA = pairReserves[0];
    const pairB = pairReserves[1];
    // only works on stable pairs which is fine for ruby since all pairs are based in USD
    const price = pairA.div(pairB);

    console.log("Price: " + price + " | Reserves: [0]: " + pairA + " [1]: " + pairB
        + "\nAmountsINN: " + weiAmount.toString()
        + "\nAmountsOUT: " + amountOut[1].toString()
        + "\nSwap Counter: " + SwapCounter

    );


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
            amountOut[1],// amountOuMin
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
                console.log("Swap Result: ", ok);
            }).catch(err => {
                console.log("Swap Result Error: ", err);
            });
        }).catch(err => {
            console.log("Swap Processing Error: ", err);
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


async function run() {
    console.log("Bot is running... after timerSpeed expires, the bot will perform an action");
    await saveData(fromToken, toToken);
    await doApproval(fromToken);// how many swaps before the approval allowance runs out
    setInterval(doSwap, timerSpeed);
};

run();

