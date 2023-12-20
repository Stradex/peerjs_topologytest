
async function main() {
    netInit();
    do {
        processCMD((await readInput()));
    }while(1);
}

main();