/**
 * @param {number[]} ranks
 * @param {number} cars
 * @return {number}
 */
var repairCars = function(ranks, cars) {
    let l = Math.min(...ranks);
    let r = Math.max(...ranks) * cars * cars;
    let helper = (mid) =>{
        let count = 0;
        for(let i = 0; i < ranks.length; i++){
            count += Math.floor(Math.sqrt(mid / ranks[i]));
            if(count > cars) return count;
        }
     
        return count;
    }
    let finalRes = Infinity;
    let binary = (left, right) => {
        if(left > right) return;
        let mid = Math.floor((left + right) / 2);   
        let res = helper(mid);
        if(res < cars){
            binary(mid+ 1, right);
        }
        else{
            finalRes = Math.min(finalRes, mid);
            binary(left, mid - 1);
        }
    }
    binary(l, r);
    return finalRes
};

repairCars([100], 1000000)