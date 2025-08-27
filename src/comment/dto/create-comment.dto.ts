import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString() @IsNotEmpty()
  postId: string;

  // content is now HTML (rich text)
  @IsString() @IsNotEmpty()
  content: string; // HTML string

  @IsOptional() @IsString()
  parentId?: string;
}
