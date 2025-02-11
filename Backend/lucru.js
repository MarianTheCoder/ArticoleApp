var canCompleteCircuit = function(gas, cost) {
    let len = gas.length;
    gas = [...gas , ...gas];
    cost = [...cost , ...cost];
    let left = 0;
    let right = 0;
    let sum = gas[0];

    while(right != gas.length){
        console.log("diff", right-left, left);
        if(right-left == len) return left;
            if(sum - cost[right] < 0){
                right++;
                sum = gas[right];
                left = right;
            }
            else{
                sum = sum - cost[right];
                right++;
                sum = sum + gas[right];
            }
        }
        return -1;
};

canCompleteCircuit([2], [2]);