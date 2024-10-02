import { HttpException, HttpStatus, Injectable, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from './entities/post.entity';
import { Repository, UpdateResult } from 'typeorm';
import { CreatePost } from './dto/create-new-post.dto';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
  ) { }
  async getAllPost(params: PageOptionsDto, userId?: number): Promise<any> {

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .orderBy('post.created_at', 'DESC')
      .skip(params.skip)
      .take(params.pageSize);

    const [entities, itemCount] = await queryBuilder.getManyAndCount();

    const transformedEntities = await Promise.all(entities.map(this.transformEntity));
    const data = new PageDto(
      transformedEntities,
      new PageMetaDto({ itemCount, pageOptionsDto: params }),
    );
    return data;
  }
  async transformEntity(entity: PostEntity): Promise<any> {
    return {
      id: entity.id,
      title: entity.title,
      status: entity.status,
      description: entity.description,
      image: entity.image,
      createdAt: entity.created_at,
      updated_at: entity.updated_at,
      createdBy: entity.created_by,
    };
  }
  async getPostById(id: number): Promise<PostEntity> {
    return await this.postRepository.findOneBy({ id });
  }

  async createPost(payload: CreatePost, request: Request): Promise<PostEntity> {
    if (!payload.title && !payload.description && !payload.image) {
      throw new HttpException('You must fill as least one property into post', HttpStatus.BAD_REQUEST);
    }
    const userId = request['user_data'].id;
    const newPost = this.postRepository.create({
      ...payload,
      created_by: { id: userId },
    });
    return await this.postRepository.save(newPost);
  }

  async updatePost(id: number, updateData: CreatePost): Promise<UpdateResult> {

    return await this.postRepository.update(id, updateData);
  }

}