"""
Cancellation utility for FastAPI

Provides tools for handling request cancellation and timeouts
"""

import asyncio
import contextlib
from typing import TypeVar, Callable, Awaitable, Optional, Any

T = TypeVar('T')

class TaskCancelled(Exception):
    """Exception raised when a task is cancelled due to timeout or client disconnection"""
    pass

async def with_timeout(
    coro: Awaitable[T], 
    timeout: float,
    cancel_message: str = "Operation timed out"
) -> T:
    """
    Execute a coroutine with a timeout
    
    Args:
        coro: Coroutine to execute
        timeout: Timeout in seconds
        cancel_message: Message to include in the exception if cancelled
        
    Returns:
        Result of the coroutine
        
    Raises:
        TaskCancelled: If the operation times out
    """
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        raise TaskCancelled(cancel_message)

@contextlib.asynccontextmanager
async def cancellation_guard(cancel_message: str = "Operation cancelled"):
    """
    Context manager that converts CancelledError to TaskCancelled
    
    Args:
        cancel_message: Message to include in the exception if cancelled
        
    Yields:
        None
        
    Raises:
        TaskCancelled: If the operation is cancelled
    """
    try:
        yield
    except asyncio.CancelledError:
        raise TaskCancelled(cancel_message)

async def cancellable(
    func: Callable[..., Awaitable[T]], 
    *args, 
    timeout: Optional[float] = None,
    timeout_message: str = "Operation timed out",
    cancel_message: str = "Operation cancelled",
    **kwargs
) -> T:
    """
    Execute a function with cancellation and timeout protection
    
    Args:
        func: Async function to execute
        *args: Arguments to pass to the function
        timeout: Optional timeout in seconds
        timeout_message: Message for timeout exception
        cancel_message: Message for cancellation exception
        **kwargs: Keyword arguments to pass to the function
        
    Returns:
        Result of the function
        
    Raises:
        TaskCancelled: If the operation is cancelled or times out
    """
    async with cancellation_guard(cancel_message):
        if timeout is not None:
            return await with_timeout(func(*args, **kwargs), timeout, timeout_message)
        return await func(*args, **kwargs)

async def run_in_threadpool_with_timeout(
    func: Callable[..., Any],
    *args,
    timeout: Optional[float] = None,
    timeout_message: str = "Operation timed out",
    cancel_message: str = "Operation cancelled",
    **kwargs
) -> Any:
    """
    Run a blocking function in a thread pool with timeout
    
    Args:
        func: Function to execute
        *args: Arguments to pass to the function
        timeout: Optional timeout in seconds
        timeout_message: Message for timeout exception
        cancel_message: Message for cancellation exception
        **kwargs: Keyword arguments to pass to the function
        
    Returns:
        Result of the function
        
    Raises:
        TaskCancelled: If the operation is cancelled or times out
    """
    from fastapi.concurrency import run_in_threadpool
    
    async with cancellation_guard(cancel_message):
        wrapped_coro = run_in_threadpool(func, *args, **kwargs)
        
        if timeout is not None:
            return await with_timeout(wrapped_coro, timeout, timeout_message)
        return await wrapped_coro 