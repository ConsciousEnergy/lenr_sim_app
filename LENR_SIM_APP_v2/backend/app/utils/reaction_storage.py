"""
Reaction Storage Module for LENR_Sim_App

This module provides functionality to persist custom fusion reactions to a file
and load them during application startup.
"""

import os
import json
import threading
from typing import List, Dict, Any, Optional
import logging
from pathlib import Path
from pydantic import ValidationError

from app.utils.logging import setup_logger
from app.physics.models import FusionReaction, FusionProduct

# Set up logger
logger = setup_logger("reaction_storage", "logs/storage.log")

class ReactionStorage:
    """
    Class for persisting custom fusion reactions to a file.
    Provides thread-safe operations for loading and saving reactions.
    """
    
    def __init__(self, file_path: str = "data/custom_reactions.json"):
        """
        Initialize the reaction storage with a file path.
        
        Args:
            file_path: Path to the storage file (default: data/custom_reactions.json)
        """
        self.file_path = file_path
        self._storage_lock = threading.RLock()
        
        # Ensure the directory exists
        directory = os.path.dirname(self.file_path)
        if directory:
            os.makedirs(directory, exist_ok=True)
            
        logger.info(f"Reaction storage initialized with file: {file_path}")
    
    def save_reactions(self, reactions: List[FusionReaction]) -> bool:
        """
        Save a list of reactions to the storage file.
        
        Args:
            reactions: List of FusionReaction objects to save
            
        Returns:
            True if successful, False otherwise
        """
        with self._storage_lock:
            try:
                # Convert reactions to dictionaries
                reaction_dicts = [reaction.dict() for reaction in reactions]
                
                # Write to file
                with open(self.file_path, 'w') as f:
                    json.dump(reaction_dicts, f, indent=2)
                
                logger.info(f"Saved {len(reactions)} reactions to {self.file_path}")
                return True
            except Exception as e:
                logger.error(f"Error saving reactions to {self.file_path}: {str(e)}")
                return False
    
    def load_reactions(self) -> List[FusionReaction]:
        """
        Load reactions from the storage file.
        
        Returns:
            List of FusionReaction objects
        """
        with self._storage_lock:
            reactions = []
            
            # Check if file exists
            if not os.path.exists(self.file_path):
                logger.info(f"Storage file {self.file_path} does not exist. Returning empty list.")
                return reactions
            
            try:
                # Read from file
                with open(self.file_path, 'r') as f:
                    reaction_dicts = json.load(f)
                
                # Convert dictionaries to FusionReaction objects
                for reaction_dict in reaction_dicts:
                    try:
                        reaction = FusionReaction(**reaction_dict)
                        reactions.append(reaction)
                    except ValidationError as ve:
                        logger.error(f"Validation error for reaction: {str(ve)}")
                
                logger.info(f"Loaded {len(reactions)} reactions from {self.file_path}")
                return reactions
            except Exception as e:
                logger.error(f"Error loading reactions from {self.file_path}: {str(e)}")
                return []
    
    def add_reaction(self, reaction: FusionReaction) -> bool:
        """
        Add a single reaction to the storage.
        
        Args:
            reaction: FusionReaction object to add
            
        Returns:
            True if successful, False otherwise
        """
        with self._storage_lock:
            # First load existing reactions
            reactions = self.load_reactions()
            
            # Check if reaction with same name already exists
            for i, existing in enumerate(reactions):
                if existing.name == reaction.name:
                    # Replace the existing reaction
                    reactions[i] = reaction
                    logger.info(f"Replaced existing reaction: {reaction.name}")
                    return self.save_reactions(reactions)
            
            # If not found, add the new reaction
            reactions.append(reaction)
            logger.info(f"Added new reaction: {reaction.name}")
            return self.save_reactions(reactions)
    
    def remove_reaction(self, reaction_name: str) -> bool:
        """
        Remove a reaction from storage by name.
        
        Args:
            reaction_name: Name of the reaction to remove
            
        Returns:
            True if successful, False otherwise
        """
        with self._storage_lock:
            # First load existing reactions
            reactions = self.load_reactions()
            
            # Find and remove the reaction
            found = False
            filtered_reactions = []
            for reaction in reactions:
                if reaction.name == reaction_name:
                    found = True
                else:
                    filtered_reactions.append(reaction)
            
            if not found:
                logger.warning(f"Reaction not found for removal: {reaction_name}")
                return False
            
            logger.info(f"Removed reaction: {reaction_name}")
            return self.save_reactions(filtered_reactions) 