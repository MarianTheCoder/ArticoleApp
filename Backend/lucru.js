/**
 * @param {number[][]} edges
 * @param {number} bob
 * @param {number[]} amount
 * @return {number}
 */

var mostProfitablePath = function(edges, bob, amount) {
    let map = new Map();
    let final = -Infinity;
    for (let i = 0; i < edges.length; i++) {
        // Ensure the Set is initialized if it doesn't already exist
        if (!map.has(edges[i][0])) {
            map.set(edges[i][0], new Set());
        }
        if (!map.has(edges[i][1])) {
            map.set(edges[i][1], new Set());
        }

        // Add each node to the other's set of neighbors
        map.get(edges[i][0]).add(edges[i][1]);
        map.get(edges[i][1]).add(edges[i][0]);
    }

    console.log(map);
    const findPathToRoot = (tree, startNode) =>{
        const visited = new Set();
        const queue = [[startNode, []]]; 
        while (queue.length > 0) {
            const [node, path] = queue.shift();
            if (node === 0) {
                return [...path, 0]; 
            }
            visited.add(node);
            let directions = Array.from(tree.get(node));
            for (const neighbor of directions) {
                if (!visited.has(neighbor)) {
                    queue.push([neighbor, [...path, node]]);
                }
            }
        }
        return [];
    }
    let pathBob = findPathToRoot(map, bob);
    console.log(pathBob);
    let DFS = (root, total, setul, bobIndex, bobVisited) =>{
        let neighbours = Array.from(map.get(root));
        let priceTotal;
        
        if(!bobVisited.has(root)){
            if(bobIndex < pathBob.length){
                bobVisited.add(pathBob[bobIndex]);
                if(root == pathBob[bobIndex]){
                    priceTotal = Math.floor(amount[root] / 2) + total;
                }
                else priceTotal = amount[root] + total;
            }
            else priceTotal = amount[root] + total;
        }
        else priceTotal = total;
        console.log("root, neighs ,total",root, neighbours , priceTotal)
        console.log("Bob",bobIndex, bobVisited);
        console.log(" ");
        setul.add(root);
        let isLeaf = neighbours.length === 1 && setul.has(neighbours[0]);
        if(isLeaf){
            console.log(final, priceTotal);
            final = Math.max(final, priceTotal);
        } 
        for (let i = 0; i < neighbours.length; i++) {
            if(!setul.has(neighbours[i])){
                DFS(neighbours[i], priceTotal, new Set(setul), bobIndex+1, new Set(bobVisited));
            }
        }
    }
    DFS(0, 0, new Set(), 0, new Set());
    console.log("final" , final)
};


mostProfitablePath([[0,2],[1,4],[1,6],[2,4],[3,6],[3,7],[5,7]], 4, [-6896,-1216,-1208,-1108,1606,-7704,-9212,-8258]);