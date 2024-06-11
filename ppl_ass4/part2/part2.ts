// PPL 2023 HW4 Part2

// Q 2.1 

// Specify the return type.
export const delayedSum = async (a: number, b: number, delay: number) : Promise<number>  => 
{
    if (delay < 0) {return Promise.reject(-1);}
  
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const sum = a + b
        resolve(sum);
      }, delay);
    });
  };

export const testDelayedSum = async () => 
{
    const start = new Date().getTime();
    await delayedSum(1.2,0,2000)
    .then (result  => 
        {
        const end = new Date().getTime();
        expect(end-start).toBeGreaterThan(2000);
        })
    .catch(error  => 
        {
            console.log('Error:', error);
            return false;
        })
 }
 
// Q 2.2

// Values returned by API calls.
export type Post = {
    userId: number;
    id: number;
    title: string;
    body: string;
}

// When invoking fetchData(postsUrl) you obtain an Array Post[]
// To obtain an array of posts
export const postsUrl = 'https://jsonplaceholder.typicode.com/posts'; 

// Append the desired post id.
export const postUrl = 'https://jsonplaceholder.typicode.com/posts/'; 

// When invoking fetchData(invalidUrl) you obtain an error
export const invalidUrl = 'https://jsonplaceholder.typicode.com/invalid';

// Depending on the url - fetchData can return either an array of Post[] or a single Post.
// Specify the return type without using any.
export const fetchData = async (url: string): Promise<string> => 
{

    const response = await fetch(url);
    const posts    = await response.json();
    if (response.status === 200)
        return posts;
    
    return "Error";        

}
    

export const testFetchData =  async () => 
{
  
    const fetchData1 = async (url:string) => 
    {
        try 
        {
          const response = await fetch(url);
          const data = await response.json();
          return data;
        }
        catch (error) 
        {
          console.log("Error:", error);
        }
    };
    fetchData1('https://jsonplaceholder.typicode.com/posts');


}

export const testFetchData2 =  async () => 
{
  
    const fetchData2 = async (url:string) => 
    {
        try 
        {
          const response = await fetch(url);
          const data = await response.json();
          return data;
        }
        catch (error) 
        {
          console.log("Error:", error);
        }
    };
    fetchData2('https://jsonplaceholder.typicode.com/posts/1');


}

export const testFetchData3 =  async () => 
{
  
    const fetchData3 = async (url:string) => 
    {
        try 
        {
          const response = await fetch(url);
          const data = await response.json();
          return data;
        }
        catch (error) 
        {
          console.log("Error:", error);
        }
    };
    fetchData3('http/jsonplaceholder.typicode.com/invalid');


}

// Q 2.3

// Specify the return type.
export const fetchMultipleUrls = async (urls: string[]) => 
{
    const fetchUrls = urls.map((url)=> fetchData(url));
    await Promise.all(fetchUrls)
    .then((values) => 
    {
        console.log(values);
    })
    .catch(error  => 
    {
        console.log('Error');

    });

}


export const testFetchMultipleUrls = async () => 
{
    const urls1 = ['https://jsonplaceholder.typicode.com/posts','https://jsonplaceholder.typicode.com/posts/1'];
    await fetchMultipleUrls(urls1);
}
export const testFetchMultipleUrls2 = async() => 
{
 
    const urls2 = ['https://jsonplaceholder.typicode.com/posts','https://jsonplaceholder.typicode.com/posts/1','http/jsonplaceholder.typicode.com/invalid']
    await fetchMultipleUrls(urls2);
}




//testDelayedSum();