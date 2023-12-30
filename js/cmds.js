//S: Console
let CMDS = [
    {name: "join server", usage: "join server <PeerID>, <User Name>", func: joinServer},
    {name: "create server", usage: "create server <Server Name>", func: createServer},
    {name: "local peer", usage: "", func: cmd_get_local_peer},
    {name: "server peer", usage: "", func: cmd_get_server_peer},
    {name: "net cmd", usage: "net cmd <Command to send>, <PeerId>, <Command Args>", func: cmd_net_cmd},
    {name: "test server", usage: "test server <Number of Clients>", func:cmd_test_server},
    {name: "say", usage: "say <message>, <route of peers separated by comma>", func:cmd_send_message},
    {name: "start call", usage: "start call <route of peers separated by comma>", func:cmd_call_start},
    {name: "end call", usage: "end call <peers to end call with>", func:cmd_call_end},
    {name: "root peer", usage: "", func:cmd_get_root_peer},
    {name: "ping", usage: "ping <route of peers separated by comma>", func:cmd_ping},
    {name: "help", usage: "help <Command Name>", func: cmd_help},
    {name: "reload", usage: "reload <New hash data>", func: cmd_reload_site},
    {name: "clear", usage: "", func: clearConsole}
];

function cmd_ping() {
    let pingRoute = (Array.prototype.slice.call(arguments))
        .filter(x => x.trim().length > 0)
        .map(x => P2P_HASH_KEY + x.trim().toUpperCase());


    if (pingRoute.length > 0) {
        printToConsole(`sending ping to route: ${pingRoute} - return route:${[...pingRoute.slice(0, pingRoute.length-1).reverse(), getLocalPeerID()]}`);
    } else {
        printToConsole(`sending ping to all peers`);
    }

    netSendData({
        tag: 'ping',
        global: !pingRoute || pingRoute.length == 0,
        time: Date.now(),
        route: pingRoute ?
            [...pingRoute.slice(0, pingRoute.length-1).reverse(), getLocalPeerID()]
            : [getLocalPeerID()]
    }, pingRoute);
}

function cmd_reload_site(newHashData) {
    const url = new URL(location.href);
    let urlStr = "";
    if (newHashData) {
        url.hash="";
        urlStr = `${url}#${newHashData.toUpperCase()}`;
    } else {
        urlStr = `${url}`;
    }
    window.location.href = urlStr;
    location.reload();
}

function cmd_net_cmd(netCmd, peerId) {
    if (!isNetServer()) {
        printToConsole("Only servers can force cmds into clients...");
        return;
    }

    let route = peerId ? [P2P_HASH_KEY + peerId.trim().toUpperCase()] : [];
    
    let cmdArgs = (Array.prototype.slice.call(arguments))
                    .slice(2, arguments.length)
                    .map(arg => arg.trim());

    netSendData({
        tag: 'cmd',
        global: !route || route.length == 0,
        cmd: netCmd,
        args: cmdArgs
    }, route);

}

function cmd_get_root_peer() {
    printToConsole(`Root peer id: ${getRootPeerFromTopology(getServerTopology())}`);
}

function cmd_call_start() {
    
    let route = (Array.prototype.slice.call(arguments))
        .filter(x => x.trim().length > 0)
        .map(x => P2P_HASH_KEY + x.trim().toUpperCase());

    startCall(route);
}
function cmd_call_end() {
    let peersToEndCallWith = (Array.prototype.slice.call(arguments))
        .filter(x => x.trim().length > 0)
        .map(x => P2P_HASH_KEY + x.trim().toUpperCase());

    endCall(peersToEndCallWith);
}

function cmd_send_message(message)
{
    if (message.trim().length == 0) return;
    
    let route = (Array.prototype.slice.call(arguments))
        .slice(1, arguments.length)
        .map(x => P2P_HASH_KEY + x.trim().toUpperCase());

    netSendData({
        tag: 'msg',
        global: !route || route.length == 0,
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