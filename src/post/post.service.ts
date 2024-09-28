import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {  PostEntity } from './entities/post.entity';
import { Repository } from 'typeorm';
import { CreatePost } from './dto/create-new-post.dto';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
  ) { }
  async transformEntity(entity: PostEntity): Promise<any> {
    return {
      id: entity.id,
      title: entity.title,
      status: entity.status,
      description: entity.description,
      thumbnail: entity.thumbnail,
      createdAt: entity.created_at,
      updated_at: entity.updated_at,
      createdBy: entity.created_by,
    };
  }
  async getPostById(id: number): Promise<PostEntity> {
    return await this.postRepository.findOneBy({ id });
  }

  async createPost(payload: CreatePost): Promise<PostEntity> {
    return await this.postRepository.save(payload);
  }

}