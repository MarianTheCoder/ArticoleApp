/**
 * @param {number[]} candies
 * @param {number} k
 * @return {number}
 */
var maximumCandies = function(candies, k) {
    let maxx = 0;
    for (let i = 0; i < candies.length; i++) {
        maxx = Math.max(maxx, candies[i]);
    }
    let helper = (mid) => {
        let sum = 0;
        for (let i = 0; i < candies.length; i++) {
            sum += Math.floor(candies[i] / mid);
            if(sum >= k) return sum;
        }
        return sum;
    }
    let maximum = 0;
    let binary = (left, right) => {
        if(left > right) return right;
        let mid = Math.floor((left + right) / 2);
        let sum = helper(mid);
        if(sum >= k) maximum = Math.max(maximum, mid);
        if(sum >= k) return binary(mid + 1, right);
        return binary(left, mid - 1);
    }
    binary(1, maxx);
    console.log(maximum);
};