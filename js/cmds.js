//S: Console
let CMDS = [
    {name: "join server", usage: "join server <PeerID>, <User Name>", func: joinServer},
    {name: "create server", usage: "create server <Server Name>", func: createServer},
    {name: "local peer", usage: "", func: cmd_get_local_peer},
    {name: "server peer", usage: "", func: cmd_get_server_peer},
    {name: "test server", usage: "test server <Number of Clients>", func:cmd_test_server},
    {name: "send", usage: "send <message>, <route of peers separated by comma>", func:cmd_send_message},
    {name: "help", usage: "help <Command Name>", func: cmd_help},
    {name: "clear", usage: "", func: clearConsole}
];

function cmd_send_message(message)
{
    if (message.trim().length == 0) return;
    
    let route = (Array.prototype.slice.call(arguments)).slice(1, arguments.length).map(x => P2P_HASH_KEY + x);

    netSendData({
        tag: 'msg',
        global: !route || route.length == 0,
        from: getLocalPeerIDFromHash(),
        msg: message.trim()
    }, route);
}

function cmd_test_server(numberOfClients) {
    setClientsToEmulate(parseInt(numberOfClients));
    createServer("Test Server");
}

function cmd_get_local_peer() {
    let localPeerID = getLocalPeerIDFromHash();
    printToConsole(`Local peer ID: ${localPeerID ? localPeerID : "There is no peerid in the hash"}`);
}

function cmd_get_server_peer() {
    let serverPeerID = getServerPeerIDFromHash();
    printToConsole(`Server peer ID: ${serverPeerID ? serverPeerID : "There is no server peerid in the hash"}`);
}

function cmd_help(args) {
    if (args.length > 0) {
        let cmd = CMDS.find(cmd => cmd.name.trim().toLowerCase() === args.trim().toLowerCase());
        if (typeof cmd !== 'undefined') {
            printToConsole( `CMD: ${cmd.name}\nUsage: ${cmd.usage}`);
        } else {
            printToConsole(`The command ${args.trim().toLowerCase()} was not found. There is no help available.`)
        }
    } else {
        printToConsole("::All CMDS::");
        CMDS.forEach(cmd => printToConsole( `\tCMD: ${cmd.name}\n\tUsage: ${cmd.usage}`));
    }
}

function processCMD(inputText) {
    let cmd = CMDS.find(cmd => inputText.trim().toLowerCase().startsWith(cmd.name.trim().toLowerCase()));

    if (typeof cmd === 'undefined') {
        printToConsole(`Command ${inputText.trim().toLowerCase()} not found`);
        return;
    }
    cmd.func(...inputText
        .trim()
        .toLowerCase()
        .replace(cmd.name.trim().toLowerCase(), "")
        .split(',').map(x => x.trim()));
}